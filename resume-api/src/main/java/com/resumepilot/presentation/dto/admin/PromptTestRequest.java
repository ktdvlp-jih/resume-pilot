package com.resumepilot.presentation.dto.admin;

import java.util.Map;

public record PromptTestRequest(
        String promptType,
        String systemPrompt,
        String personaPrompt,
        String guardPrompt,
        String skillPrompt,
        String rubricPrompt,
        String taskPrompt,
        String outputPrompt,
        String userPrompt,
        Map<String, Object> variables
) {}
