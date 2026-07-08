package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record LlmModelRouteResponse(
        UUID id,
        String operation,
        UUID providerId,
        String providerSlug,
        String providerName,
        String modelName,
        int priority,
        boolean enabled
) {}
