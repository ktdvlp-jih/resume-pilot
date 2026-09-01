package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceChatSessionStatus;

import java.time.Instant;
import java.util.UUID;

public record ExperienceChatSessionSummaryResponse(
        UUID id,
        String title,
        ExperienceChatSessionStatus status,
        UUID targetExperienceId,
        UUID appliedExperienceId,
        Instant updatedAt
) {}
