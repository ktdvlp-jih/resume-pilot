package com.resumepilot.application.auth;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class SocialOAuthStateCodec {

    private static final long MAX_AGE_SECONDS = 900;
    private static final long LINK_MAX_AGE_SECONDS = 86_400; // 계정 연결·이메일 확인용 24시간

    private final ObjectMapper objectMapper;

    @Value("${jwt.secret}")
    private String signingSecret;

    public record State(
            String provider,
            String frontendUrl,
            String returnPath,
            long issuedAtEpochSec,
            Boolean termsAccepted,
            Boolean privacyAccepted
    ) {
        public boolean hasLegalConsent() {
            return Boolean.TRUE.equals(termsAccepted) && Boolean.TRUE.equals(privacyAccepted);
        }
    }

    /** 동일 이메일 계정에 SNS를 연결하기 전 사용자 확인용 */
    public record LinkPending(
            String provider,
            String oauthId,
            String email,
            String name,
            String userId,
            long issuedAtEpochSec
    ) {}

    public String encode(State state) {
        return encodePayload(state);
    }

    public State decode(String raw) {
        State state = decodePayload(raw, State.class);
        if (state.provider() == null || state.frontendUrl() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth state 필드가 부족합니다");
        }
        assertFresh(state.issuedAtEpochSec(), MAX_AGE_SECONDS);
        return state;
    }

    public String encodeLink(LinkPending pending) {
        return encodePayload(pending);
    }

    public LinkPending decodeLink(String raw) {
        LinkPending pending = decodePayload(raw, LinkPending.class);
        if (pending.provider() == null || pending.oauthId() == null
                || pending.email() == null || pending.userId() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "계정 연결 정보가 올바르지 않습니다");
        }
        assertFresh(pending.issuedAtEpochSec(), LINK_MAX_AGE_SECONDS);
        return pending;
    }

    private String encodePayload(Object value) {
        try {
            String payloadJson = objectMapper.writeValueAsString(value);
            String payload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            return payload + "." + sign(payload);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth 토큰 생성 실패");
        }
    }

    private <T> T decodePayload(String raw, Class<T> type) {
        if (raw == null || raw.isBlank() || !raw.contains(".")) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth 토큰이 올바르지 않습니다");
        }
        int dot = raw.lastIndexOf('.');
        String payload = raw.substring(0, dot);
        String sig = raw.substring(dot + 1);
        if (!sign(payload).equals(sig)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth 토큰 서명이 일치하지 않습니다");
        }
        try {
            byte[] jsonBytes = Base64.getUrlDecoder().decode(payload);
            return objectMapper.readValue(jsonBytes, type);
        } catch (IllegalArgumentException | IOException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth 토큰 파싱 실패");
        }
    }

    private void assertFresh(long issuedAtEpochSec, long maxAgeSeconds) {
        long age = Instant.now().getEpochSecond() - issuedAtEpochSec;
        if (age < 0 || age > maxAgeSeconds) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth 토큰이 만료되었습니다");
        }
    }

    private String sign(String payload) {
        if (signingSecret == null || signingSecret.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth signing secret이 설정되지 않았습니다");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "OAuth state 서명 실패");
        }
    }
}
