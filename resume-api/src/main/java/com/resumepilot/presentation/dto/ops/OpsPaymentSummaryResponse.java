package com.resumepilot.presentation.dto.ops;

import java.time.Instant;
import java.util.UUID;

public record OpsPaymentSummaryResponse(
        UUID id,
        UUID userId,
        String orderId,
        int amountKrw,
        String status,
        Instant createdAt
) {}
