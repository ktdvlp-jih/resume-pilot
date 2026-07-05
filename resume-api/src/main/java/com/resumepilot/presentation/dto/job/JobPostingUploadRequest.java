package com.resumepilot.presentation.dto.job;

import com.resumepilot.domain.company.JobSourceType;
import jakarta.validation.constraints.NotNull;

public record JobPostingUploadRequest(
        @NotNull JobSourceType sourceType,
        String content,
        String sourceUrl,
        String title
) {}
