package com.resumepilot.presentation.dto.ai;

import jakarta.validation.constraints.NotBlank;

public record AiContentRequest(@NotBlank String content) {}
