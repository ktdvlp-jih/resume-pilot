package com.resumepilot.presentation.dto.internal;

import java.util.List;
import java.util.Map;

public record LlmRuntimeConfigResponse(
        Map<String, List<LlmRuntimeRoute>> routes
) {
    public record LlmRuntimeRoute(
            String providerSlug,
            String baseUrl,
            String apiKey,
            String modelName,
            int priority
    ) {}
}
