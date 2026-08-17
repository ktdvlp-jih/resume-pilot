package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PromptVersionCreateRequest(
        @NotNull String personaPrompt,
        @NotNull String guardPrompt,
        String skillPrompt,
        String rubricPrompt,
        @NotNull String taskPrompt,
        @NotNull String outputPrompt,
        @NotBlank String userPrompt
) {
    public PromptVersionCreateRequest {
        if (skillPrompt == null) {
            skillPrompt = "";
        }
        if (rubricPrompt == null) {
            rubricPrompt = "";
        }
    }
}
