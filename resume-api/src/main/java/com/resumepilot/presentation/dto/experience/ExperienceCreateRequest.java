package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record ExperienceCreateRequest(
        @NotNull ExperienceType type,
        @NotBlank String title,
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
        LocalDate endDate
) {}
