package com.resumepilot.infrastructure.integration;

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

@Slf4j
@Component
@RequiredArgsConstructor
public class GitHubOAuthClient {

    private final WebClient.Builder webClientBuilder;

    public record TokenResponse(String accessToken, String tokenType, String scope) {}

    public record GitHubUser(String login, String id) {}

    public TokenResponse exchangeCode(String clientId, String clientSecret, String code, String redirectUri) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code.trim());
        form.add("redirect_uri", redirectUri);
        try {
            JsonNode response = webClientBuilder.build()
                    .post()
                    .uri("https://github.com/login/oauth/access_token")
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters.fromFormData(form))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (response == null || !response.hasNonNull("access_token")) {
                String err = response != null && response.has("error_description")
                        ? response.path("error_description").asText("GitHub OAuth 실패")
                        : "GitHub OAuth 토큰 응답이 비어 있습니다";
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, err);
            }
            return new TokenResponse(
                    response.path("access_token").asText(),
                    textOrNull(response, "token_type"),
                    textOrNull(response, "scope"));
        } catch (WebClientResponseException ex) {
            log.warn("GitHub OAuth token exchange failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub OAuth 토큰 교환에 실패했습니다");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("GitHub OAuth token exchange error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub OAuth 토큰 교환 중 오류");
        }
    }

    public GitHubUser fetchUser(String accessToken) {
        try {
            JsonNode response = webClientBuilder.build()
                    .get()
                    .uri("https://api.github.com/user")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (response == null || !response.hasNonNull("login")) {
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub 사용자 정보를 가져오지 못했습니다");
            }
            return new GitHubUser(response.path("login").asText(), response.path("id").asText());
        } catch (WebClientResponseException ex) {
            log.warn("GitHub user fetch failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub 사용자 정보 조회에 실패했습니다");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("GitHub user fetch error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub 사용자 정보 조회 중 오류");
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }
}
