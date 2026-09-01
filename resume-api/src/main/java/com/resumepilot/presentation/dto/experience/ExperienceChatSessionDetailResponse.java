package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceChatSessionStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ExperienceChatSessionDetailResponse(
        UUID id,
        String title,
        ExperienceChatSessionStatus status,
        UUID targetExperienceId,
        UUID appliedExperienceId,
        Map<String, Object> latestDraft,
        List<ExperienceChatMessageResponse> messages,
        Instant createdAt,
        Instant updatedAt
) {}
