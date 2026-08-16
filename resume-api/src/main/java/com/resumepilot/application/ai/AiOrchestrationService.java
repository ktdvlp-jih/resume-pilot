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
        List<List<String>> sectionExperienceIds = filterOwnedSectionExperienceIds(
                selectedExperienceIds, request.sectionExperienceIds(), request.sectionTitles());
        assertExperiencesUsable(userId, selectedExperienceIds);
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId.toString());
        payload.put("keywords", request.keywords());
        payload.put("rewrite_level", request.rewriteLevel());
        payload.put("job_analysis", request.jobAnalysis());
        payload.put("section_titles", request.sectionTitles());
        payload.put("experience_ids", selectedExperienceIds);
        payload.put("section_experience_ids", sectionExperienceIds);
        payload.put("forbidden_expressions", getForbiddenList());
        if (request.sectionIndex() != null) {
            payload.put("section_index", request.sectionIndex());
        }
        if (request.existingParagraphs() != null && !request.existingParagraphs().isEmpty()) {
            payload.put("existing_paragraphs", request.existingParagraphs());
        }
        if (request.sectionTargetChars() != null && !request.sectionTargetChars().isEmpty()) {
            payload.put("section_target_chars", request.sectionTargetChars());
        }
        if (request.userInstruction() != null && !request.userInstruction().isBlank()) {
            payload.put("user_instruction", request.userInstruction());
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
                                "section_experience_ids", sectionExperienceIds,
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

    /**
     * 설정 초고(경력기술서·5-1~5-5)를 경험 라이브러리와 대조.
     * 경험 0건이면 LLM 호출 없이 차단. 초고 빈 값은 허용.
     */
    public Map<String, Object> portfolioReview(UUID userId, AiPortfolioReviewRequest request) {
        long start = System.currentTimeMillis();
        List<Experience> experiences = experienceRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        if (experiences.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.EXPERIENCE_INSUFFICIENT,
                    "경험 라이브러리에 등록된 경험이 없습니다. 경험을 먼저 추가한 뒤 점검해 주세요."
            );
        }
        String draft = request.content() == null ? "" : request.content();
        Map<String, Object> payload = new HashMap<>();
        payload.put("section_type", request.sectionType().name());
        payload.put("section_purpose", request.sectionType().purpose());
        payload.put("content", draft);
        payload.put("experiences", formatExperiencesForPortfolioReview(experiences));
        try {
            Map<String, Object> result = aiGatewayClient.reviewPortfolio(payload);
            logUsage(userId, "portfolio_review", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "portfolio_review", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "portfolio_review", start, false, null, e.getMessage());
            throw e;
        }
    }

    /** 문항 제목만 구조화. 경험 배정은 프론트의 규칙이 한다. */
    public Map<String, Object> analyzeSections(UUID userId, AiSectionAnalysisRequest request) {
        long start = System.currentTimeMillis();
        List<String> titles = request.sectionTitles().stream()
                .map(t -> t == null ? "" : t.trim())
                .filter(t -> !t.isBlank())
                .limit(5)
                .toList();
        if (titles.isEmpty()) {
            return Map.of("sections", List.of());
        }
        try {
            Map<String, Object> result = aiGatewayClient.analyzeSections(Map.of("section_titles", titles));
            logUsage(userId, "section_analysis", start, true, str(result != null ? result.get("model") : null), null);
            return result;
        } catch (BusinessException e) {
            logUsage(userId, "section_analysis", start, false, null, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            logUsage(userId, "section_analysis", start, false, null, e.getMessage());
            throw e;
        }
    }

    /** RAG 우회 — 유저 경험 전부를 텍스트로 직렬화해 프롬프트에 넣는다. */
    static String formatExperiencesForPortfolioReview(List<Experience> experiences) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < experiences.size(); i++) {
            Experience e = experiences.get(i);
            if (i > 0) sb.append("\n\n---\n\n");
            sb.append("id: ").append(e.getId()).append('\n');
            sb.append("title: ").append(nullToEmpty(e.getTitle())).append('\n');
            if (e.getType() != null) {
                sb.append("type: ").append(e.getType().name()).append('\n');
            }
            appendIfPresent(sb, "role", e.getRole());
            appendIfPresent(sb, "description", e.getDescription());
            appendIfPresent(sb, "contribution", e.getContribution());
            appendIfPresent(sb, "result", e.getResult());
            appendIfPresent(sb, "numeric_result", e.getNumericResult());
            appendIfPresent(sb, "situation", e.getStarSituation());
            appendIfPresent(sb, "task", e.getStarTask());
            appendIfPresent(sb, "action", e.getStarAction());
            appendIfPresent(sb, "outcome", e.getStarResult());
            if (e.getSkills() != null && !e.getSkills().isEmpty()) {
                sb.append("skills: ").append(String.join(", ", e.getSkills())).append('\n');
            }
            if (e.getStartDate() != null || e.getEndDate() != null) {
                sb.append("period: ")
                        .append(e.getStartDate() != null ? e.getStartDate() : "")
                        .append(" ~ ")
                        .append(e.getEndDate() != null ? e.getEndDate() : "")
                        .append('\n');
            }
        }
        return sb.toString();
    }

    private static void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value == null || value.isBlank()) return;
        sb.append(label).append(": ").append(value.trim()).append('\n');
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

    private List<List<String>> filterOwnedSectionExperienceIds(
            List<String> ownedExperienceIds,
            List<List<UUID>> sectionExperienceIds,
            List<String> sectionTitles
    ) {
        int n = sectionTitles != null ? sectionTitles.size() : 0;
        if (n == 0) return List.of();
        Set<String> owned = new HashSet<>(ownedExperienceIds);
        List<List<String>> rows = new ArrayList<>();
        List<List<UUID>> src = sectionExperienceIds != null ? sectionExperienceIds : List.of();
        for (int i = 0; i < n; i++) {
            List<UUID> row = i < src.size() && src.get(i) != null ? src.get(i) : List.of();
            rows.add(row.stream()
                    .map(UUID::toString)
                    .filter(owned::contains)
                    .distinct()
                    .limit(3)
                    .toList());
        }
        return rows;
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
