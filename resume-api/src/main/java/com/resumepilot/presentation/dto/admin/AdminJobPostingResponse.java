package com.resumepilot.presentation.dto.admin;

import com.resumepilot.domain.company.JobSourceType;

import java.time.Instant;
import java.util.UUID;

public record AdminJobPostingResponse(
        UUID id,
        String title,
        JobSourceType sourceType,
        String sourceUrl,
        UUID companyId,
        String companyName,
        boolean shared,
        UUID userId,
        String ownerEmail,
        Instant createdAt,
        Instant closesAt
) {}
