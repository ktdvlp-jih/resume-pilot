package com.resumepilot.presentation.dto.resume;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ResumeVersionResponse(
        UUID id,
        UUID resumeId,
        Integer versionNumber,
        String content,
        Map<String, Object> metadata,
        UUID parentVersionId,
        Instant createdAt
) {}
