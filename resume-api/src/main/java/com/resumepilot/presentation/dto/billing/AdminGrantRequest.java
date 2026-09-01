package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdminGrantRequest(
        @NotBlank String kind,
        String operation,
        @NotNull @Min(1) Integer amount,
        String note
) {}
