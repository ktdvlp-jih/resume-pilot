package com.resumepilot.presentation.controller;

import com.resumepilot.application.integration.NotionOAuthService;
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
@RequestMapping("/api/v1/experiences/import/notion/oauth")
@RequiredArgsConstructor
@Tag(name = "NotionOAuth")
public class NotionOAuthController {

    private final NotionOAuthService notionOAuthService;

    @GetMapping("/authorize-url")
    @Operation(summary = "Notion OAuth 시작 URL (프론트에서 window.location 이동)")
    public ApiResponse<NotionOAuthAuthorizeResponse> authorizeUrl(
            @RequestParam(defaultValue = "/experiences/import") String returnPath,
            @RequestParam(required = false) String frontendUrl) {
        UUID userId = SecurityUtils.getCurrentUserId();
        String web = frontendUrl != null && !frontendUrl.isBlank()
                ? frontendUrl
                : notionOAuthService.defaultFrontendUrl();
        String url = notionOAuthService.buildAuthorizeUrl(userId, returnPath, web);
        return ApiResponse.ok(new NotionOAuthAuthorizeResponse(url, notionOAuthService.resolveRedirectUri()));
    }

    @GetMapping("/callback")
    @Operation(summary = "Notion OAuth 콜백 (Notion → API → SPA 리다이렉트)")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {
        String fallbackFrontend = notionOAuthService.defaultFrontendUrl();
        String fallbackReturn = "/experiences/import";
        try {
            if (error != null && !error.isBlank()) {
                response.sendRedirect(notionOAuthService.buildErrorRedirect(
                        fallbackFrontend, fallbackReturn, "Notion 연동이 취소되었습니다"));
                return;
            }
            String redirect = notionOAuthService.handleCallback(code, state);
            response.sendRedirect(redirect);
        } catch (BusinessException ex) {
            response.sendRedirect(notionOAuthService.buildErrorRedirect(
                    fallbackFrontend, fallbackReturn, ex.getMessage()));
        }
    }
}
