package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record ForbiddenExpressionResponse(UUID id, String expression, String suggestion, String severity, boolean enabled) {}
