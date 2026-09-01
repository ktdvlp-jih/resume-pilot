package com.resumepilot.presentation.dto.billing;

import java.time.Instant;
import java.util.UUID;

public record PaymentAdminResponse(
        UUID id,
        UUID userId,
        UUID productId,
        String productName,
        String orderId,
        int amountKrw,
        int refundedAmountKrw,
        String status,
        Instant createdAt,
        Instant cancelledAt
) {}
