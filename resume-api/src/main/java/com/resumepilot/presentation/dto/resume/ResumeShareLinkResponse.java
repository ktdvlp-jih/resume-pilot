package com.resumepilot.presentation.dto.resume;

import java.time.Instant;

public record ResumeShareLinkResponse(
        String token,
        String path,
        Instant expiresAt
) {}
