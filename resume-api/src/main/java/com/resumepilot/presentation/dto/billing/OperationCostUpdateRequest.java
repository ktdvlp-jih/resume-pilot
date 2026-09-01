package com.resumepilot.presentation.dto.billing;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OperationCostUpdateRequest(@NotNull @Min(0) Integer tokenCost) {}
