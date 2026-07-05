package com.resumepilot.presentation.dto.job;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CompanyResponse(
        UUID id,
        String name,
        List<String> coreValues,
        List<String> talentProfile,
        List<String> techStack,
        String culture,
        List<String> hiringKeywords,
        Map<String, Object> metadata,
        Instant createdAt
) {}
