package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PromptVersionCreateRequest(
        @NotNull String personaPrompt,
        @NotNull String guardPrompt,
        @NotNull String taskPrompt,
        @NotNull String outputPrompt,
        @NotBlank String userPrompt
) {}
