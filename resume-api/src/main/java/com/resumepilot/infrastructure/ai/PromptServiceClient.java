package com.resumepilot.infrastructure.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class PromptServiceClient {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${prompt-service.url:http://localhost:8001}")
    private String promptServiceUrl;

    public Map<String, Object> testPrompt(String promptType, String systemPrompt, String userPrompt, Map<String, Object> variables) {
        Map<String, Object> body = Map.of(
                "prompt_type", promptType != null ? promptType : "RESUME_GENERATION",
                "system_prompt", systemPrompt != null ? systemPrompt : "",
                "user_prompt", userPrompt != null ? userPrompt : "",
                "variables", variables != null ? variables : Map.of()
        );
        return post("/prompts/test", body);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> post(String path, Map<String, Object> body) {
        String json = webClientBuilder.build()
                .post()
                .uri(promptServiceUrl + path)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        try {
            Map<String, Object> response = objectMapper.readValue(json, new TypeReference<>() {});
            if (Boolean.TRUE.equals(response.get("success"))) {
                return (Map<String, Object>) response.get("data");
            }
        } catch (Exception ignored) {
        }
        return Map.of("error", "prompt-service call failed");
    }
}
