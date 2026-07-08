package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LlmModelRouteUpdateRequest(
        @NotNull UUID id,
        @NotBlank String modelName,
        @NotNull Integer priority,
        @NotNull Boolean enabled
) {}
