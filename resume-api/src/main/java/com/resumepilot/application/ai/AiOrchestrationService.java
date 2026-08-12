package com.resumepilot.application.ai;

import com.resumepilot.domain.ai.*;
import com.resumepilot.domain.admin.AiUsageLog;
import com.resumepilot.domain.admin.AiUsageLogRepository;
import com.resumepilot.domain.admin.ForbiddenExpressionRepository;
import com.resumepilot.domain.experience.Experience;
import com.resumepilot.domain.experience.ExperienceRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.application.style.WritingStyleService;
import com.resumepilot.presentation.dto.ai.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestrationService {

    private final AiGatewayClient aiGatewayClient;
    private final AiGenerationRepository generationRepository;
    private final AiReviewRepository reviewRepository;
    private final AiDetectionRepository detectionRepository;
    private final AiUsageLogRepository usageLogRepository;
    private final ForbiddenExpressionRepository forbiddenRepository;
    private final ExperienceRepository experienceRepository;
    private final WritingStyleService writingStyleService;
    private final PlatformTransactionManager transactionManager;

    @Transactional
    public Map<String, Object> generate(UUID userId, AiGenerateRequest request) {
        try {
            writingStyleService.ensureAnalyzed(userId);
        } catch (Exception e) {
            log.warn("문체 자동 분석 스킵 (userId={}): {}", userId, e.getMessage());
        }
        long start = System.currentTimeMillis();
        List<String> selectedExperienceIds = filterOwnedExperienceIds(userId, request.experienceIds());
        assertExperiencesUsable(userId, selectedExperienceIds);
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId.toString());
        payload.put("keywords", request.keywords());
        payload.put("rewrite_level", request.rewriteLevel());
        payload.put("job_analysis", request.jobAnalysis());
        payload.put("section_titles", request.sectionTitles());
        payload.put("experience_ids", selectedExperienceIds);
        payload.put("forbidden_expressions", getForbiddenList());
        if (request.sectionIndex() != null) {
            payload.put("section_index", request.sectionIndex());
        }
        if (request.existingParagraphs() != null && !request.existingParagraphs().isEmpty()) {
            payload.put("existing_paragraphs", request.existingParagraphs());
        }
        if (Boolean.TRUE.equals(request.skipPostprocess())) {
            payload.put("skip_postprocess", true);
        }

        try {
            Map<String, Object> result = aiGatewayClient.generateResume(payload);
            logUsage(userId, "generate", start, true, str(result != null ? result.get("model") : null), null);

            if (result != null) {
                validateExperienceIds(userId, result);
                // 부분 재생성(skip_postprocess)은 기존 점수를 유지하므로 품질 점수가 비어 있을 수 있음
                Map<String, Object> qualityScores = castMap(result.get("quality_scores"));
                AiGeneration gen = AiGeneration.builder()
                        .userId(userId)
                        .jobPostingId(request.jobPostingId())
                        .rewriteLevel(request.rewriteLevel())
                        .inputContext(Map.of(
                                "keywords", request.keywords(),
                                "job_analysis", request.jobAnalysis() != null ? request.jobAnalysis() : Map.of(),
                                "experience_ids", selectedExperienceIds,
                                "section_titles", request.sectionTitles() != null ? request.sectionTitles() : List.of(),
                                "section_index", request.sectionIndex() != null ? request.sectionIndex() : -1))
                        .outputContent(String.valueOf(result.get("content")))
                        .qualityScores(qualityScores != null ? qualityScores : Map.of())
                        .experienceIds(toStringList(result.get("experience_ids")))
                        .build();
                generationRepository.save(gen);
                result.put("generation_id", gen.getId().toString());
                try {
                    if (!Boolean.TRUE.equals(request.skipPostprocess())) {
                        persistArtifacts(gen.getId(), result);
                    }
                } catch (Exception e) {
                    log.warn("AI artifact persist skipped (generationId={}): {}", gen.getId(), e.getMessage());
                }
            }
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "generate", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "generate", start, false, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> detect(UUID userId, String content) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = Map.of("content", content, "forbidden_expressions", getAllForbiddenList());
        try {
            Map<String, Object> result = aiGatewayClient.detectAiTraces(payload);
            logUsage(userId, "detect", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "detect", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "detect", start, false, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> review(UUID userId, AiReviewRequest request) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", request.content());
        if (request.jobAnalysis() != null) payload.put("job_analysis", request.jobAnalysis());
        try {
            Map<String, Object> result = aiGatewayClient.reviewFeedback(payload);
            logUsage(userId, "review", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "review", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "review", start, false, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> interviewQuestions(UUID userId, String content) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> result = aiGatewayClient.interviewQuestions(Map.of("content", content));
            logUsage(userId, "interview", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "interview", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "interview", start, false, null, e.getMessage());
            throw e;
        }
    }

    public Map<String, Object> compareKeywords(UUID userId, AiKeywordCompareRequest request) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> result = aiGatewayClient.compareKeywords(Map.of(
                    "job_keywords", request.jobKeywords(),
                    "resume_content", request.resumeContent()
            ));
            logUsage(userId, "compare_keywords", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "compare_keywords", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "compare_keywords", start, false, null, e.getMessage());
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<AiGenerationResponse> myGenerations(UUID userId) {
        return generationRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(g -> new AiGenerationResponse(g.getId(), g.getOutputContent(), g.getRewriteLevel(),
                        g.getQualityScores(), g.getExperienceIds(), g.getCreatedAt()))
                .toList();
    }

    private List<String> filterOwnedExperienceIds(UUID userId, List<UUID> experienceIds) {
        if (experienceIds == null || experienceIds.isEmpty()) return List.of();
        Set<String> owned = new HashSet<>();
        experienceRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .forEach(e -> owned.add(e.getId().toString()));
        return experienceIds.stream().map(UUID::toString).filter(owned::contains).toList();
    }

    /**
     * 날조 방지: 선택 경험이 없거나 전부 제목 수준이면 LLM 호출 전에 막는다.
     * thin(설명 일부)은 UI 경고 후 허용 — 여기서는 empty급만 차단.
     */
    private void assertExperiencesUsable(UUID userId, List<String> selectedIds) {
        if (selectedIds == null || selectedIds.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.EXPERIENCE_INSUFFICIENT,
                    "생성에 사용할 경험을 1개 이상 선택하세요. 경험 라이브러리에서 설명·역할·성과를 채운 뒤 선택해 주세요."
            );
        }
        Set<UUID> idSet = selectedIds.stream().map(UUID::fromString).collect(Collectors.toSet());
        List<Experience> selected = experienceRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .filter(e -> idSet.contains(e.getId()))
                .toList();
        boolean anySubstance = selected.stream().anyMatch(AiOrchestrationService::hasMinimalSubstance);
        if (!anySubstance) {
            throw new BusinessException(
                    ErrorCode.EXPERIENCE_INSUFFICIENT,
                    "선택한 경험에 생성에 쓸 내용이 부족합니다. 설명·성과·STAR 중 하나 이상을 보강한 뒤 다시 시도하세요."
            );
        }
    }

    private static boolean hasMinimalSubstance(Experience e) {
        String desc = nullToEmpty(e.getDescription()).trim();
        String result = nullToEmpty(e.getResult()).trim();
        String star = (nullToEmpty(e.getStarSituation())
                + nullToEmpty(e.getStarTask())
                + nullToEmpty(e.getStarAction())
                + nullToEmpty(e.getStarResult())).trim();
        return desc.length() >= 30 || result.length() >= 5 || star.length() >= 40;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private void validateExperienceIds(UUID userId, Map<String, Object> result) {
        List<String> returned = toStringList(result.get("experience_ids"));
        if (returned.isEmpty()) return;

        Set<String> owned = new HashSet<>();
        experienceRepository.findByUserIdOrderByUpdatedAtDesc(userId)
                .forEach(e -> owned.add(e.getId().toString()));

        List<String> invalid = returned.stream().filter(id -> !owned.contains(id)).toList();
        if (!invalid.isEmpty()) {
            result.put("validation_warning", "허용되지 않은 경험 ID가 포함되어 제거했습니다: " + invalid);
            List<String> valid = returned.stream().filter(owned::contains).toList();
            result.put("experience_ids", valid);
            if (Boolean.TRUE.equals(result.get("insufficient")) == false && valid.isEmpty()) {
                result.put("content", "내용이 부족하여 생성하지 않음");
                result.put("insufficient", true);
            }
        }
    }

    private void persistArtifacts(UUID generationId, Map<String, Object> result) {
        Object detections = result.get("detections");
        if (detections instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> d) {
                    String level = normalizeDetectionLevel(d.get("level"));
                    if (level == null) {
                        log.warn("Skip detection with invalid level={} (generationId={})", d.get("level"), generationId);
                        continue;
                    }
                    String sentence = str(d.get("sentence"));
                    if (sentence == null || sentence.isBlank()) {
                        continue;
                    }
                    detectionRepository.save(AiDetection.builder()
                            .generationId(generationId)
                            .sentenceIndex(intVal(d.get("sentence_index")))
                            .sentence(sentence)
                            .level(level)
                            .reason(str(d.get("reason")))
                            .suggestion(str(d.get("suggestion")))
                            .build());
                }
            }
        }
        Object reviews = result.get("reviews");
        if (reviews instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> r) {
                    reviewRepository.save(AiReview.builder()
                            .generationId(generationId)
                            .paragraphIndex(intVal(r.get("paragraph_index")))
                            .strengths(toStringList(r.get("strengths")))
                            .weaknesses(toStringList(r.get("weaknesses")))
                            .companyFit(str(r.get("company_fit")))
                            .specificity(str(r.get("specificity")))
                            .persuasiveness(str(r.get("persuasiveness")))
                            .starApplied(Boolean.TRUE.equals(r.get("star_applied")))
                            .improvement(str(r.get("improvement")))
                            .suggestion(str(r.get("suggestion")))
                            .build());
                }
            }
        }
    }

    /** DB CHECK: GREEN / YELLOW / RED 만 허용. 그 외는 null 반환해 스킵. */
    private String normalizeDetectionLevel(Object raw) {
        if (raw == null) return null;
        String level = String.valueOf(raw).trim().toUpperCase();
        if (level.isEmpty() || "NULL".equals(level)) return null;
        return switch (level) {
            case "GREEN", "YELLOW", "RED" -> level;
            case "G" -> "GREEN";
            case "Y" -> "YELLOW";
            case "R" -> "RED";
            default -> null;
        };
    }

    private int intVal(Object o) {
        return o instanceof Number n ? n.intValue() : 0;
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }

    /** 생성용 — STYLE은 문자열 삭제에 쓰면 문장이 깨지므로 제외 */
    private List<String> getForbiddenList() {
        return forbiddenRepository.findByEnabledTrue().stream()
                .filter(f -> !"STYLE".equalsIgnoreCase(f.getSeverity()))
                .map(f -> f.getExpression()).toList();
    }

    /** 탐지용 — STYLE(번역투 등) 포함 전체 */
    private List<String> getAllForbiddenList() {
        return forbiddenRepository.findByEnabledTrue().stream()
                .map(f -> f.getExpression()).toList();
    }

    private void logUsage(UUID userId, String operation, long startMs, boolean success, String model, String errorMessage) {
        String err = errorMessage;
        if (err != null && err.length() > 500) {
            err = err.substring(0, 500);
        }
        final String errFinal = err;
        // 실패 로그가 상위 @Transactional 롤백에 말리지 않도록 독립 커밋
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(status -> usageLogRepository.save(AiUsageLog.builder()
                .userId(userId)
                .service("resume-ai")
                .operation(operation)
                .model(model)
                .durationMs((int) (System.currentTimeMillis() - startMs))
                .status(success ? "SUCCESS" : "FAILED")
                .errorMessage(success ? null : errFinal)
                .build()));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object o) {
        return o instanceof Map ? (Map<String, Object>) o : Map.of();
    }

    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) return list.stream().map(String::valueOf).toList();
        return List.of();
    }
}
