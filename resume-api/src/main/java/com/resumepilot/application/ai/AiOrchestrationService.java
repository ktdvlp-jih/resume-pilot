package com.resumepilot.application.ai;

import com.resumepilot.domain.ai.*;
import com.resumepilot.domain.admin.AiUsageLog;
import com.resumepilot.domain.admin.AiUsageLogRepository;
import com.resumepilot.domain.admin.ForbiddenExpressionRepository;
import com.resumepilot.domain.experience.ExperienceRepository;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.application.style.WritingStyleService;
import com.resumepilot.presentation.dto.ai.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

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

    @Transactional
    public Map<String, Object> generate(UUID userId, AiGenerateRequest request) {
        try {
            writingStyleService.ensureAnalyzed(userId);
        } catch (Exception e) {
            log.warn("문체 자동 분석 스킵 (userId={}): {}", userId, e.getMessage());
        }
        long start = System.currentTimeMillis();
        List<String> selectedExperienceIds = filterOwnedExperienceIds(userId, request.experienceIds());
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_id", userId.toString());
        payload.put("keywords", request.keywords());
        payload.put("rewrite_level", request.rewriteLevel());
        payload.put("job_analysis", request.jobAnalysis());
        payload.put("section_titles", request.sectionTitles());
        payload.put("experience_ids", selectedExperienceIds);
        payload.put("forbidden_expressions", getForbiddenList());

        Map<String, Object> result = aiGatewayClient.generateResume(payload);
        logUsage(userId, "generate", start, result != null, str(result != null ? result.get("model") : null));

        if (result != null) {
            validateExperienceIds(userId, result);
            AiGeneration gen = AiGeneration.builder()
                    .userId(userId)
                    .jobPostingId(request.jobPostingId())
                    .rewriteLevel(request.rewriteLevel())
                    .inputContext(Map.of("keywords", request.keywords(), "job_analysis", request.jobAnalysis() != null ? request.jobAnalysis() : Map.of(), "experience_ids", selectedExperienceIds))
                    .outputContent(String.valueOf(result.get("content")))
                    .qualityScores(castMap(result.get("quality_scores")))
                    .experienceIds(toStringList(result.get("experience_ids")))
                    .build();
            generationRepository.save(gen);
            result.put("generation_id", gen.getId().toString());
            persistArtifacts(gen.getId(), result);
        }
        return result;
    }

    public Map<String, Object> detect(UUID userId, String content) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = Map.of("content", content, "forbidden_expressions", getForbiddenList());
        Map<String, Object> result = aiGatewayClient.detectAiTraces(payload);
        logUsage(userId, "detect", start, true, str(result != null ? result.get("model") : null));
        return result;
    }

    public Map<String, Object> review(UUID userId, AiReviewRequest request) {
        long start = System.currentTimeMillis();
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", request.content());
        if (request.jobAnalysis() != null) payload.put("job_analysis", request.jobAnalysis());
        Map<String, Object> result = aiGatewayClient.reviewFeedback(payload);
        logUsage(userId, "review", start, true, str(result != null ? result.get("model") : null));
        return result;
    }

    public Map<String, Object> interviewQuestions(UUID userId, String content) {
        long start = System.currentTimeMillis();
        Map<String, Object> result = aiGatewayClient.interviewQuestions(Map.of("content", content));
        logUsage(userId, "interview", start, true, str(result != null ? result.get("model") : null));
        return result;
    }

    public Map<String, Object> compareKeywords(UUID userId, AiKeywordCompareRequest request) {
        long start = System.currentTimeMillis();
        Map<String, Object> result = aiGatewayClient.compareKeywords(Map.of(
                "job_keywords", request.jobKeywords(),
                "resume_content", request.resumeContent()
        ));
        logUsage(userId, "compare_keywords", start, true, str(result != null ? result.get("model") : null));
        return result;
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
                    detectionRepository.save(AiDetection.builder()
                            .generationId(generationId)
                            .sentenceIndex(intVal(d.get("sentence_index")))
                            .sentence(String.valueOf(d.get("sentence")))
                            .level(String.valueOf(d.get("level")))
                            .reason(d.get("reason") != null ? String.valueOf(d.get("reason")) : null)
                            .suggestion(d.get("suggestion") != null ? String.valueOf(d.get("suggestion")) : null)
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

    private int intVal(Object o) {
        return o instanceof Number n ? n.intValue() : 0;
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }

    private List<String> getForbiddenList() {
        return forbiddenRepository.findByEnabledTrue().stream()
                .map(f -> f.getExpression()).toList();
    }

    private void logUsage(UUID userId, String operation, long startMs, boolean success, String model) {
        usageLogRepository.save(AiUsageLog.builder()
                .userId(userId)
                .service("resume-ai")
                .operation(operation)
                .model(model)
                .durationMs((int) (System.currentTimeMillis() - startMs))
                .status(success ? "SUCCESS" : "FAILED")
                .build());
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
