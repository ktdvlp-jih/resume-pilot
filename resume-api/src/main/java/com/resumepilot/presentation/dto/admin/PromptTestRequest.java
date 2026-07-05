package com.resumepilot.presentation.dto.admin;

import java.util.Map;

public record PromptTestRequest(
        String promptType,
        String systemPrompt,
        String userPrompt,
        Map<String, Object> variables
) {}
