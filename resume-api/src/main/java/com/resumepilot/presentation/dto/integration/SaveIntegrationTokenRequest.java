package com.resumepilot.presentation.dto.integration;

import jakarta.validation.constraints.NotBlank;

public record SaveIntegrationTokenRequest(
        @NotBlank String accessToken
) {}
