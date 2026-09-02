package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.NotBlank;

public record RedeemCouponRequest(
        @NotBlank String code
) {}
