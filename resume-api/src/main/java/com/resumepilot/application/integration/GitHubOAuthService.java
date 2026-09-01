package com.resumepilot.application.integration;

import com.resumepilot.application.billing.IntegrationSettingsService;
import com.resumepilot.domain.integration.IntegrationProvider;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.integration.GitHubOAuthClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GitHubOAuthService {

    private static final String AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
    private static final String CALLBACK_PATH = "/api/v1/experiences/import/github/oauth/callback";
    /** Obsidian vault in private GitHub repo 포함 — repo 읽기 */
    private static final String DEFAULT_SCOPE = "read:user,repo";

    private final IntegrationSettingsService integrationSettings;
    private final UserIntegrationService userIntegrationService;
    private final NotionOAuthStateCodec stateCodec;
    private final GitHubOAuthClient gitHubOAuthClient;

    @Value("${app.public-api-url:http://localhost:8080}")
    private String publicApiUrl;

    @Value("${app.public-web-url:http://localhost:5173}")
    private String publicWebUrl;

    public String buildAuthorizeUrl(UUID userId, String returnPath, String frontendUrl) {
        String clientId = requireClientId();
        String redirectUri = resolveRedirectUri();
        String signingSecret = requireSigningSecret();
        String safeReturn = sanitizeReturnPath(returnPath);
        String safeFrontend = sanitizeFrontendUrl(frontendUrl);

        NotionOAuthStateCodec.State state = new NotionOAuthStateCodec.State(
                userId, safeReturn, safeFrontend, Instant.now().getEpochSecond());
        String encodedState = stateCodec.encode(state, signingSecret);

        return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", DEFAULT_SCOPE)
                .queryParam("state", encodedState)
                .build(true)
                .toUriString();
    }

    public String handleCallback(String code, String stateParam) {
        if (code == null || code.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth code가 없습니다");
        }
        NotionOAuthStateCodec.State state = stateCodec.decode(stateParam, requireSigningSecret());
        String clientId = requireClientId();
        String clientSecret = integrationSettings.getPlain(IntegrationSettingsService.GITHUB_CLIENT_SECRET);
        if (clientSecret.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, "GitHub Client Secret이 설정되지 않았습니다");
        }
        String redirectUri = resolveRedirectUri();
        GitHubOAuthClient.TokenResponse token = gitHubOAuthClient.exchangeCode(
                clientId, clientSecret, code.trim(), redirectUri);
        GitHubOAuthClient.GitHubUser user = gitHubOAuthClient.fetchUser(token.accessToken());

        Map<String, Object> meta = new LinkedHashMap<>();
        if (user.login() != null) {
            meta.put("login", user.login());
        }
        if (user.id() != null) {
            meta.put("githubUserId", user.id());
        }
        if (token.scope() != null) {
            meta.put("scope", token.scope());
        }

        userIntegrationService.saveOAuthTokens(
                state.userId(),
                IntegrationProvider.GITHUB,
                token.accessToken(),
                null,
                user.login(),
                meta);

        return state.frontendUrl() + state.returnPath()
                + "?github=connected"
                + (user.login() != null ? "&login=" + urlEncode(user.login()) : "");
    }

    public String buildErrorRedirect(String frontendUrl, String returnPath, String message) {
        String safeFrontend = sanitizeFrontendUrl(frontendUrl);
        String safeReturn = sanitizeReturnPath(returnPath);
        return safeFrontend + safeReturn
                + "?github=error&message=" + urlEncode(message == null ? "연동 실패" : message);
    }

    public String resolveRedirectUri() {
        String configured = integrationSettings.getPlain(IntegrationSettingsService.GITHUB_OAUTH_REDIRECT_URI);
        if (configured != null && !configured.isBlank()) {
            return configured.trim();
        }
        String base = publicApiUrl.endsWith("/") ? publicApiUrl.substring(0, publicApiUrl.length() - 1) : publicApiUrl;
        return base + CALLBACK_PATH;
    }

    public String defaultFrontendUrl() {
        return publicWebUrl.endsWith("/") ? publicWebUrl.substring(0, publicWebUrl.length() - 1) : publicWebUrl;
    }

    private String requireClientId() {
        String clientId = integrationSettings.getPlain(IntegrationSettingsService.GITHUB_CLIENT_ID);
        if (clientId.isBlank()) {
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR,
                    "GitHub Client ID가 설정되지 않았습니다. 관리자 → 연동 설정에서 등록하세요.");
        }
        return clientId.trim();
    }

    private String requireSigningSecret() {
        String secret = integrationSettings.getPlain(IntegrationSettingsService.GITHUB_CLIENT_SECRET);
        if (!secret.isBlank()) {
            return secret;
        }
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "GitHub Client Secret이 설정되지 않았습니다");
    }

    private static String sanitizeReturnPath(String returnPath) {
        String path = (returnPath == null || returnPath.isBlank()) ? "/experiences/import" : returnPath.trim();
        if (!path.startsWith("/") || path.startsWith("//") || path.contains("://")) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "returnPath가 올바르지 않습니다");
        }
        return path;
    }

    private String sanitizeFrontendUrl(String frontendUrl) {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return defaultFrontendUrl();
        }
        String url = frontendUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "frontendUrl이 올바르지 않습니다");
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
