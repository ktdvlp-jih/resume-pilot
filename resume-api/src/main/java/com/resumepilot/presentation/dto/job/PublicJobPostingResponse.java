package com.resumepilot.presentation.dto.job;

import java.time.Instant;

public record PublicJobPostingResponse(
        String title,
        String companyName,
        Instant closesAt,
        Instant createdAt
) {}
