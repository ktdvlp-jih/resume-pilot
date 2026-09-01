package com.resumepilot.infrastructure.integration;

import com.fasterxml.jackson.databind.JsonNode;
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

@Slf4j
@Component
@RequiredArgsConstructor
public class NotionOAuthClient {

    private final WebClient.Builder webClientBuilder;

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            String workspaceId,
            String workspaceName,
            String botId,
            String ownerType,
            String ownerId) {}

    public TokenResponse exchangeCode(String clientId, String clientSecret, String code, String redirectUri) {
        String basic = Base64.getEncoder().encodeToString(
                (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));
        Map<String, String> body = Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", redirectUri);
        try {
            JsonNode response = webClientBuilder.build()
                    .post()
                    .uri("https://api.notion.com/v1/oauth/token")
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + basic)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (response == null || !response.hasNonNull("access_token")) {
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion OAuth 토큰 응답이 비어 있습니다");
            }
            JsonNode owner = response.path("owner");
            return new TokenResponse(
                    response.path("access_token").asText(),
                    textOrNull(response, "refresh_token"),
                    textOrNull(response, "workspace_id"),
                    textOrNull(response, "workspace_name"),
                    textOrNull(response, "bot_id"),
                    textOrNull(owner, "type"),
                    owner.path("user").path("id").asText(owner.path("workspace").path("id").asText(""))
            );
        } catch (WebClientResponseException ex) {
            log.warn("Notion OAuth token exchange failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion OAuth 토큰 교환에 실패했습니다");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Notion OAuth token exchange error: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion OAuth 토큰 교환 중 오류");
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
