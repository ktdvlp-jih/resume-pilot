package com.resumepilot.presentation.dto.resume;

import java.time.Instant;

public record PublicSharedResumeResponse(
        String title,
        String companyName,
        String content,
        Instant expiresAt
) {}
