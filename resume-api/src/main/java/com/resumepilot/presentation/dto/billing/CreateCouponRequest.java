package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateCouponRequest(
        String code,
        @NotBlank String kind,
        String operation,
        @NotNull @Min(1) Integer grantAmount,
        @Min(1) Integer maxRedemptions,
        Instant validUntil,
        String note
) {}
