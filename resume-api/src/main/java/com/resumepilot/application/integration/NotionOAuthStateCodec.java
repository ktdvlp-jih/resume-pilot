package com.resumepilot.application.integration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotionOAuthStateCodec {

    private static final long MAX_AGE_SECONDS = 900;

    private final ObjectMapper objectMapper;

    public record State(UUID userId, String returnPath, String frontendUrl, long issuedAtEpochSec) {}

    public String encode(State state, String signingSecret) {
        try {
            String payloadJson = objectMapper.writeValueAsString(state);
            String payload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            String sig = sign(payload, signingSecret);
            return payload + "." + sig;
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth state 생성 실패");
        }
    }

    public State decode(String raw, String signingSecret) {
        if (raw == null || raw.isBlank() || !raw.contains(".")) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state가 올바르지 않습니다");
        }
        int dot = raw.lastIndexOf('.');
        String payload = raw.substring(0, dot);
        String sig = raw.substring(dot + 1);
        if (!sign(payload, signingSecret).equals(sig)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state 서명이 일치하지 않습니다");
        }
        try {
            byte[] jsonBytes = Base64.getUrlDecoder().decode(payload);
            State state = objectMapper.readValue(jsonBytes, State.class);
            if (state.userId() == null || state.returnPath() == null || state.frontendUrl() == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state 필드가 부족합니다");
            }
            long age = Instant.now().getEpochSecond() - state.issuedAtEpochSec();
            if (age < 0 || age > MAX_AGE_SECONDS) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state가 만료되었습니다");
            }
            if (!state.returnPath().startsWith("/")) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "returnPath는 / 로 시작해야 합니다");
            }
            return state;
        } catch (IllegalArgumentException | IOException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state 파싱 실패");
        }
    }

    private static String sign(String payload, String secret) {
        if (secret == null || secret.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth signing secret이 설정되지 않았습니다");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth state 서명 실패");
        }
    }
}
