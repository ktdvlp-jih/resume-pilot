package com.resumepilot.presentation.dto.ai;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiGenerationResponse(
        UUID id,
        String outputContent,
        Integer rewriteLevel,
        Map<String, Object> qualityScores,
        List<String> experienceIds,
        Instant createdAt
) {}
