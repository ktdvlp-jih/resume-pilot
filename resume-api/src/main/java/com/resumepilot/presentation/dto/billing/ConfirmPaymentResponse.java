package com.resumepilot.presentation.dto.billing;

import java.util.UUID;

public record ConfirmPaymentResponse(UUID paymentId, String status, String result) {}
