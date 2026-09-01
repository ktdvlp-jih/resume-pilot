package com.resumepilot.presentation.dto.billing;

public record IntegrationOAuthHintsResponse(
        String publicApiUrl,
        String notionRedirectUri,
        String githubRedirectUri,
        String notionRedirectTemplate,
        String githubRedirectTemplate
) {}
