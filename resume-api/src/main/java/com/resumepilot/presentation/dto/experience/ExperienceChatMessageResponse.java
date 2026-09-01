package com.resumepilot.presentation.dto.experience;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ExperienceChatMessageResponse(
        UUID id,
        String role,
        String content,
        Map<String, Object> draftSnapshot,
        Instant createdAt
) {}
