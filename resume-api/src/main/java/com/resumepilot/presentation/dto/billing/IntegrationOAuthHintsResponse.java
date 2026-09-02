package com.resumepilot.presentation.dto.billing;

public record IntegrationOAuthHintsResponse(
        String publicApiUrl,
        String notionRedirectUri,
        String githubRedirectUri,
        String googleLoginRedirectUri,
        String kakaoLoginRedirectUri,
        String notionRedirectTemplate,
        String githubRedirectTemplate,
        String googleLoginRedirectTemplate,
        String kakaoLoginRedirectTemplate
) {}
