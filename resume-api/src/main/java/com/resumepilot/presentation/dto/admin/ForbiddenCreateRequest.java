package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record ForbiddenCreateRequest(@NotBlank String expression, String suggestion, String severity) {}
