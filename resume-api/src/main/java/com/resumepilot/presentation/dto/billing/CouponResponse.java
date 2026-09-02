package com.resumepilot.presentation.dto.billing;

import java.time.Instant;
import java.util.UUID;

public record CouponResponse(
        UUID id,
        String code,
        String kind,
        String operation,
        int grantAmount,
        int maxRedemptions,
        int redemptionCount,
        Instant validFrom,
        Instant validUntil,
        boolean enabled,
        String note,
        String createdByAdminEmail,
        Instant createdAt
) {}
