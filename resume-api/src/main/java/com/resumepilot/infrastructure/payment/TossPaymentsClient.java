package com.resumepilot.infrastructure.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TossPaymentsClient {

    private static final String BASE = "https://api.tosspayments.com";

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    public void confirm(String secretKey, String paymentKey, String orderId, int amount) {
        try {
            client(secretKey)
                    .post()
                    .uri(BASE + "/v1/payments/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "paymentKey", paymentKey,
                            "orderId", orderId,
                            "amount", amount
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (WebClientResponseException ex) {
            throw mapTossError(ex);
        } catch (Exception e) {
            log.warn("Toss confirm failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "결제 승인에 실패했습니다");
        }
    }

    public JsonNode getPayment(String secretKey, String paymentKey) {
        try {
            String body = client(secretKey)
                    .get()
                    .uri(BASE + "/v1/payments/{paymentKey}", paymentKey)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return objectMapper.readTree(body);
        } catch (WebClientResponseException ex) {
            throw mapTossError(ex);
        } catch (Exception e) {
            log.warn("Toss get payment failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "결제 조회에 실패했습니다");
        }
    }

    public void cancel(String secretKey, String paymentKey, String cancelReason, Integer cancelAmount) {
        try {
            Map<String, Object> body = cancelAmount == null
                    ? Map.of("cancelReason", cancelReason)
                    : Map.of("cancelReason", cancelReason, "cancelAmount", cancelAmount);
            client(secretKey)
                    .post()
                    .uri(BASE + "/v1/payments/{paymentKey}/cancel", paymentKey)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (WebClientResponseException ex) {
            throw mapTossError(ex);
        } catch (Exception e) {
            log.warn("Toss cancel failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "결제 취소에 실패했습니다");
        }
    }

    private WebClient client(String secretKey) {
        String encoded = Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
        return webClientBuilder.build()
                .mutate()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + encoded)
                .build();
    }

    private BusinessException mapTossError(WebClientResponseException ex) {
        String code = "";
        String message = "결제 처리에 실패했습니다";
        try {
            JsonNode node = objectMapper.readTree(ex.getResponseBodyAsString());
            if (node.has("code")) {
                code = node.get("code").asText("");
            }
            if (node.has("message")) {
                message = node.get("message").asText(message);
            }
        } catch (Exception ignored) {
            // keep defaults
        }
        if ("ALREADY_PROCESSED_PAYMENT".equals(code) || "ALREADY_PROCESSING_PAYMENT".equals(code)
                || "ALREADY_PROCESSING_REQUEST".equals(code)) {
            return new BusinessException(ErrorCode.PAYMENT_ALREADY_PROCESSING, message);
        }
        log.warn("Toss API error status={} code={}", ex.getStatusCode().value(), code);
        return new BusinessException(ErrorCode.INVALID_INPUT, message);
    }
}
