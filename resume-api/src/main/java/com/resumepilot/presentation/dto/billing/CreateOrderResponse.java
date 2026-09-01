package com.resumepilot.presentation.dto.billing;

public record CreateOrderResponse(
        String orderId,
        int amount,
        String orderName,
        String customerKey
) {}
