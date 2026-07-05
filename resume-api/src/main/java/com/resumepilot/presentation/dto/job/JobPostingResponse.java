package com.resumepilot.presentation.dto.job;

import com.resumepilot.domain.company.JobSourceType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record JobPostingResponse(
        UUID id,
        String title,
        JobSourceType sourceType,
        String sourceUrl,
        String rawContent,
        Map<String, Object> parsedJson,
        UUID companyId,
        String companyName,
        Instant createdAt
) {}
