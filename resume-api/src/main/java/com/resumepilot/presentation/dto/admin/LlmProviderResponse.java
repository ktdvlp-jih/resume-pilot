package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record LlmProviderResponse(
        UUID id,
        String slug,
        String displayName,
        String providerType,
        String baseUrl,
        boolean enabled,
        boolean hasApiKey,
        String apiKeyMasked
) {}
