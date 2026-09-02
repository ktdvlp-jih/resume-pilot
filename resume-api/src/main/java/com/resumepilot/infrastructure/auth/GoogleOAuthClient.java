package com.resumepilot.infrastructure.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleOAuthClient {

    private final WebClient.Builder webClientBuilder;

    public record Profile(String id, String email, String name) {}

    public String buildAuthorizeUrl(String clientId, String redirectUri, String state) {
        return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .queryParam("access_type", "online")
                .queryParam("prompt", "select_account")
                .build()
                .encode()
                .toUriString();
    }

    public Profile exchangeAndFetchProfile(String clientId, String clientSecret, String code, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code.trim());
        form.add("grant_type", "authorization_code");
        form.add("redirect_uri", redirectUri);
        try {
            JsonNode token = webClientBuilder.build()
                    .post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (token == null || !token.hasNonNull("access_token")) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Google 로그인에 실패했습니다");
            }
            String accessToken = token.path("access_token").asText();
            JsonNode user = webClientBuilder.build()
                    .get()
                    .uri("https://openidconnect.googleapis.com/v1/userinfo")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (user == null || !user.hasNonNull("sub")) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Google 사용자 정보를 가져오지 못했습니다");
            }
            String email = textOrNull(user, "email");
            if (email == null || email.isBlank()) {
                throw new BusinessException(ErrorCode.OAUTH_EMAIL_REQUIRED);
            }
            return new Profile(user.path("sub").asText(), email.trim().toLowerCase(), textOrNull(user, "name"));
        } catch (WebClientResponseException ex) {
            log.warn("Google OAuth failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Google 로그인에 실패했습니다");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google OAuth error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Google 로그인 중 오류가 발생했습니다");
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }
}
