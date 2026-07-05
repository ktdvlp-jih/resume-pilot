package com.resumepilot.presentation.dto.resume;

public record ResumeVersionCompareResponse(
        ResumeVersionResponse versionA,
        ResumeVersionResponse versionB
) {}
