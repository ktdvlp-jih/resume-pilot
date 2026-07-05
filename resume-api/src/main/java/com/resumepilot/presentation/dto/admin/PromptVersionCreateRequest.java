package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record PromptVersionCreateRequest(
        @NotBlank String systemPrompt,
        @NotBlank String userPrompt
) {}
