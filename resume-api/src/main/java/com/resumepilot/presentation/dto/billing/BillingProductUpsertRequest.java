package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record BillingProductUpsertRequest(
        UUID id,
        @NotBlank String name,
        @NotBlank String kind,
        String operation,
        @NotNull @Min(1) Integer grantAmount,
        @NotNull @Min(0) Integer priceKrw,
        Boolean enabled,
        Integer sortOrder
) {}
