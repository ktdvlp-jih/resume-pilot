package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record PromptVersionResponse(
        UUID id, UUID promptTemplateId, Integer versionNumber,
        String systemPrompt, String userPrompt, boolean active
) {}
