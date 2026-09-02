package com.resumepilot.presentation.dto.billing;

import java.time.Instant;
import java.util.UUID;

public record LedgerEntryResponse(
        UUID id,
        String entryType,
        String kind,
        String operation,
        int amount,
        String note,
        Instant createdAt,
        String grantedByAdminEmail,
        String couponCode
) {}
