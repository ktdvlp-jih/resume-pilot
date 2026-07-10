package com.resumepilot.presentation.dto.admin;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AiLogResponse(
        UUID id,
        UUID userId,
        String service,
        String operation,
        String model,
        Integer inputTokens,
        Integer outputTokens,
        Integer durationMs,
        String status,
        String errorMessage,
        Map<String, Object> metadata,
        Instant createdAt
) {}
