package com.resumepilot.presentation.dto.billing;

import java.util.UUID;

public record BillingProductResponse(
        UUID id,
        String name,
        String kind,
        String operation,
        int grantAmount,
        int priceKrw,
        boolean enabled,
        int sortOrder
) {}
