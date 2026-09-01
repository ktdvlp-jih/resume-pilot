package com.resumepilot.presentation.controller;

import com.resumepilot.application.integration.GitHubOAuthService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.integration.NotionOAuthAuthorizeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/experiences/import/github/oauth")
@RequiredArgsConstructor
@Tag(name = "GitHubOAuth")
public class GitHubOAuthController {

    private final GitHubOAuthService gitHubOAuthService;

    @GetMapping("/authorize-url")
    @Operation(summary = "GitHub OAuth 시작 URL")
    public ApiResponse<NotionOAuthAuthorizeResponse> authorizeUrl(
            @RequestParam(defaultValue = "/experiences/import") String returnPath,
            @RequestParam(required = false) String frontendUrl) {
        UUID userId = SecurityUtils.getCurrentUserId();
        String web = frontendUrl != null && !frontendUrl.isBlank()
                ? frontendUrl
                : gitHubOAuthService.defaultFrontendUrl();
        String url = gitHubOAuthService.buildAuthorizeUrl(userId, returnPath, web);
        return ApiResponse.ok(new NotionOAuthAuthorizeResponse(url, gitHubOAuthService.resolveRedirectUri()));
    }

    @GetMapping("/callback")
    @Operation(summary = "GitHub OAuth 콜백")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false) String error_description,
            HttpServletResponse response) throws IOException {
        String fallbackFrontend = gitHubOAuthService.defaultFrontendUrl();
        String fallbackReturn = "/experiences/import";
        try {
            if (error != null && !error.isBlank()) {
                String msg = error_description != null && !error_description.isBlank()
                        ? error_description
                        : "GitHub 연동이 취소되었습니다";
                response.sendRedirect(gitHubOAuthService.buildErrorRedirect(
                        fallbackFrontend, fallbackReturn, msg));
                return;
            }
            String redirect = gitHubOAuthService.handleCallback(code, state);
            response.sendRedirect(redirect);
        } catch (BusinessException ex) {
            response.sendRedirect(gitHubOAuthService.buildErrorRedirect(
                    fallbackFrontend, fallbackReturn, ex.getMessage()));
        }
    }
}
