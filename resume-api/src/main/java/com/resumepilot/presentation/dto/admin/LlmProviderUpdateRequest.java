package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record LlmProviderUpdateRequest(
        @NotBlank String displayName,
        String baseUrl,
        Boolean enabled,
        String apiKey
) {}
