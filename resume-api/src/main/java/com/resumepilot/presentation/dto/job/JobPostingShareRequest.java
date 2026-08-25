package com.resumepilot.presentation.dto.job;

import jakarta.validation.constraints.NotNull;

public record JobPostingShareRequest(@NotNull Boolean shared) {}
