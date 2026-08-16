package com.resumepilot.infrastructure.ai;

import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

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

    public Map<String, Object> reviewPortfolio(Map<String, Object> request) {
        return post("/review/portfolio", request);
    }

    private Map<String, Object> post(String path, Map<String, Object> request) {
        try {
            return client().post()
                    .uri(resumeAiUrl + path)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<ApiResponse<Map<String, Object>>>() {})
                    .map(ApiResponse::getData)
                    .block();
        } catch (WebClientResponseException ex) {
            String body = ex.getResponseBodyAsString();
            String message = extractErrorMessage(body);
            if (message == null || message.isBlank()) {
                message = "AI service error: HTTP " + ex.getStatusCode().value();
            }
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, message);
        }
    }

    private static String extractErrorMessage(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        String key = "\"message\"";
        int idx = body.indexOf(key);
        if (idx < 0) {
            return null;
        }
        int start = body.indexOf('"', idx + key.length());
        if (start < 0) {
            return null;
        }
        int end = body.indexOf('"', start + 1);
        if (end < 0) {
            return null;
        }
        return body.substring(start + 1, end);
    }
}
