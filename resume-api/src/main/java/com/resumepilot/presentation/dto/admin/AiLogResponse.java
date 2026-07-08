package com.resumepilot.presentation.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AiLogResponse(
        UUID id,
        UUID userId,
        String service,
        String operation,
        String model,
        Integer durationMs,
        String status,
        Instant createdAt
) {}
