package com.resumepilot.infrastructure.ai;

import com.resumepilot.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class AiGatewayClient {

    @Value("${ai.resume-ai-url}")
    private String resumeAiUrl;

    private final WebClient.Builder webClientBuilder;

    private WebClient client() {
        return webClientBuilder.build();
    }

    public Map<String, Object> analyzeJobPosting(Map<String, Object> request) {
        return post("/analyze/job-posting", request);
    }

    public Map<String, Object> analyzeWritingStyle(Map<String, Object> request) {
        return post("/analyze/writing-style", request);
    }

    public Map<String, Object> generateResume(Map<String, Object> request) {
        return post("/generate/resume", request);
    }

    public Map<String, Object> detectAiTraces(Map<String, Object> request) {
        return post("/detect/ai-traces", request);
    }

    public Map<String, Object> reviewFeedback(Map<String, Object> request) {
        return post("/review/feedback", request);
    }

    public Map<String, Object> interviewQuestions(Map<String, Object> request) {
        return post("/generate/interview-questions", request);
    }

    public Map<String, Object> compareKeywords(Map<String, Object> request) {
        return post("/compare/keywords", request);
    }

    private Map<String, Object> post(String path, Map<String, Object> request) {
        return client().post()
                .uri(resumeAiUrl + path)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {})
                .map(ApiResponse::getData)
                .block();
    }
}
