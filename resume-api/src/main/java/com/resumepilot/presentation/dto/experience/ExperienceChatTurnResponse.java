package com.resumepilot.presentation.dto.experience;

import java.util.List;
import java.util.Map;

public record ExperienceChatTurnResponse(
        ExperienceChatMessageResponse userMessage,
        ExperienceChatMessageResponse assistantMessage,
        Map<String, Object> latestDraft,
        List<String> missingFields,
        String model
) {}
