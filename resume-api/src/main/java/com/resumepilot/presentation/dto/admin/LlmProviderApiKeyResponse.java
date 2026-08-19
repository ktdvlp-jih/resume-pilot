package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record LlmProviderApiKeyResponse(
        UUID id,
        String slug,
        String displayName,
        String apiKey
) {}
