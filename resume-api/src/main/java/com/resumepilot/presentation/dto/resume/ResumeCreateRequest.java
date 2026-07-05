package com.resumepilot.presentation.dto.resume;

import jakarta.validation.constraints.NotBlank;

public record ResumeCreateRequest(
        @NotBlank String title,
        String companyName,
        String description,
        String content
) {}
