package com.resumepilot.presentation.dto.experience;

import jakarta.validation.constraints.NotBlank;

public record SendExperienceChatMessageRequest(
        @NotBlank String message
) {}
