package com.resumepilot.presentation.dto.resume;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record ResumeCreateRequest(
        @NotBlank String title,
        String companyName,
        String description,
        String content,
        UUID jobPostingId
) {}
