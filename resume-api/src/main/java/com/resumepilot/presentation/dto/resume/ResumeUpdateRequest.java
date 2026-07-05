package com.resumepilot.presentation.dto.resume;

public record ResumeUpdateRequest(
        String title,
        String companyName,
        String description
) {}
