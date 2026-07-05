package com.resumepilot.presentation.dto.style;

import jakarta.validation.constraints.NotBlank;

public record WritingStyleAnalyzeRequest(
        @NotBlank String content,
        String resumeId
) {}
