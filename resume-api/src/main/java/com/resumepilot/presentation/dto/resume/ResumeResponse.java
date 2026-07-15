package com.resumepilot.presentation.dto.resume;

import java.time.Instant;
import java.util.UUID;

public record ResumeResponse(
        UUID id,
        String title,
        String companyName,
        String description,
        UUID jobPostingId,
        Integer latestVersionNumber,
        String latestContent,
        Instant createdAt,
        Instant updatedAt
) {}
