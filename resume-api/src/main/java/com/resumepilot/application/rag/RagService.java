package com.resumepilot.application.rag;

import com.resumepilot.domain.experience.Experience;
import com.resumepilot.domain.experience.ExperienceRepository;
import com.resumepilot.infrastructure.ai.RagServiceClient;
import com.resumepilot.presentation.dto.rag.ExperienceRecommendResponse;
import com.resumepilot.presentation.dto.rag.RagSearchRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class RagService {

    private final RagServiceClient ragServiceClient;
    private final ExperienceRepository experienceRepository;

    public List<Map<String, Object>> search(UUID userId, RagSearchRequest request) {
        return ragServiceClient.search(userId, request.query(), request.entityTypes(), request.topK());
    }

    @Transactional(readOnly = true)
    public List<ExperienceRecommendResponse> recommendExperiences(
            UUID userId, List<String> keywords, int topK, double minScore) {
        if (keywords == null || keywords.isEmpty()) {
            return List.of();
        }
        String query = String.join(" ", keywords).trim();
        if (query.isEmpty()) {
            return List.of();
        }
        // 임계값 필터 후 topK를 채우기 위해 여유분 조회
        int fetchK = Math.min(Math.max(topK * 3, 10), 20);
        List<Map<String, Object>> results = ragServiceClient.search(
                userId, query, List.of("EXPERIENCE"), fetchK);
        if (results == null || results.isEmpty()) {
            return List.of();
        }

        List<ExperienceRecommendResponse> recommendations = new ArrayList<>();
        for (Map<String, Object> r : results) {
            if (recommendations.size() >= topK) break;
            double score = r.get("score") instanceof Number n ? n.doubleValue() : 0;
            if (score < minScore) continue;
            UUID expId = UUID.fromString(String.valueOf(r.get("entity_id")));
            experienceRepository.findById(expId).ifPresent(exp -> {
                if (!exp.getUserId().equals(userId)) return;
                recommendations.add(new ExperienceRecommendResponse(
                        exp.getId(), exp.getTitle(), exp.getType().name(),
                        exp.getDescription(), exp.getResult(), score
                ));
            });
        }
        return recommendations;
    }

    public void embedExperience(UUID userId, Experience exp) {
        // 자소서 RAG 추천 품질을 위해 제목·역할·본문·성과·STAR·기술을 모두 임베딩한다.
        String text = String.join("\n",
                nullToEmpty(exp.getTitle()),
                exp.getType() != null ? exp.getType().name() : "",
                nullToEmpty(exp.getRole()),
                nullToEmpty(exp.getDescription()),
                nullToEmpty(exp.getContribution()),
                nullToEmpty(exp.getResult()),
                nullToEmpty(exp.getNumericResult()),
                nullToEmpty(exp.getStarSituation()),
                nullToEmpty(exp.getStarTask()),
                nullToEmpty(exp.getStarAction()),
                nullToEmpty(exp.getStarResult()),
                exp.getSkills() == null ? "" : String.join(", ", exp.getSkills())
        ).trim();
        ragServiceClient.createEmbedding(userId, "EXPERIENCE", exp.getId(), text);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public void embedResume(UUID userId, UUID versionId, String content) {
        ragServiceClient.createEmbedding(userId, "RESUME", versionId, content);
    }
}
