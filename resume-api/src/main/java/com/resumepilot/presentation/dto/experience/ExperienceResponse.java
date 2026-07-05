package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExperienceResponse(
        UUID id,
        ExperienceType type,
        String title,
        String description,
        String role,
        String contribution,
        String result,
        String numericResult,
        String starSituation,
        String starTask,
        String starAction,
        String starResult,
        List<String> skills,
        LocalDate startDate,
        LocalDate endDate,
        Instant createdAt,
        Instant updatedAt
) {}
