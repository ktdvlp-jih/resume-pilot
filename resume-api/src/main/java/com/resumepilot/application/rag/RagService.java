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
    public List<ExperienceRecommendResponse> recommendExperiences(UUID userId, List<String> keywords, int topK) {
        String query = String.join(" ", keywords);
        List<Map<String, Object>> results = ragServiceClient.search(
                userId, query, List.of("EXPERIENCE"), topK);

        List<ExperienceRecommendResponse> recommendations = new ArrayList<>();
        for (Map<String, Object> r : results) {
            UUID expId = UUID.fromString(String.valueOf(r.get("entity_id")));
            experienceRepository.findById(expId).ifPresent(exp -> {
                double score = r.get("score") instanceof Number n ? n.doubleValue() : 0;
                recommendations.add(new ExperienceRecommendResponse(
                        exp.getId(), exp.getTitle(), exp.getType().name(),
                        exp.getDescription(), exp.getResult(), score
                ));
            });
        }
        return recommendations;
    }

    public void embedExperience(UUID userId, Experience exp) {
        String text = String.join("\n",
                exp.getTitle(),
                Optional.ofNullable(exp.getDescription()).orElse(""),
                Optional.ofNullable(exp.getRole()).orElse(""),
                Optional.ofNullable(exp.getResult()).orElse(""),
                Optional.ofNullable(exp.getStarAction()).orElse("")
        );
        ragServiceClient.createEmbedding(userId, "EXPERIENCE", exp.getId(), text);
    }

    public void embedResume(UUID userId, UUID versionId, String content) {
        ragServiceClient.createEmbedding(userId, "RESUME", versionId, content);
    }
}
