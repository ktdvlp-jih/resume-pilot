package com.resumepilot.presentation.dto.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record LlmModelRoutesBulkUpdateRequest(
        @NotEmpty @Valid List<LlmModelRouteUpdateRequest> routes
) {}
