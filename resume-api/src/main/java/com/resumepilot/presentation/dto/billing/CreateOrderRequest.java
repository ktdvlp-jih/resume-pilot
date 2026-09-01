package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateOrderRequest(@NotNull UUID productId) {}
