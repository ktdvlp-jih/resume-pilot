package com.resumepilot.infrastructure.ai;

import com.resumepilot.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RagServiceClient {

    @Value("${ai.rag-service-url}")
    private String ragServiceUrl;

    private final WebClient.Builder webClientBuilder;

    private WebClient client() {
        return webClientBuilder.build();
    }

    public void createEmbedding(UUID userId, String entityType, UUID entityId, String text) {
        try {
            client().post()
                    .uri(ragServiceUrl + "/embeddings")
                    .bodyValue(Map.of(
                            "user_id", userId.toString(),
                            "entity_type", entityType,
                            "entity_id", entityId.toString(),
                            "text", text
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
        } catch (Exception ignored) {
        }
    }

    public List<Map<String, Object>> search(UUID userId, String query, List<String> entityTypes, int topK) {
        try {
            return client().post()
                    .uri(ragServiceUrl + "/search")
                    .bodyValue(Map.of(
                            "query", query,
                            "user_id", userId.toString(),
                            "entity_types", entityTypes,
                            "top_k", topK
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<ApiResponse<List<Map<String, Object>>>>() {})
                    .map(ApiResponse::getData)
                    .block();
        } catch (Exception e) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> buildContext(UUID userId, List<String> keywords, Map<String, Object> jobAnalysis) {
        try {
            return client().post()
                    .uri(ragServiceUrl + "/context/build")
                    .bodyValue(Map.of(
                            "user_id", userId.toString(),
                            "keywords", keywords,
                            "job_analysis", jobAnalysis != null ? jobAnalysis : Map.of()
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {})
                    .map(ApiResponse::getData)
                    .block();
        } catch (Exception e) {
            return Map.of();
        }
    }
}
