package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ExperienceCreateRequest(
        @NotNull ExperienceType type,
        @NotBlank @Size(max = 100) String title,
        @Size(max = 2000) String description,
        @Size(max = 100) String role,
        @Size(max = 1000) String contribution,
        @Size(max = 500) String result,
        @Size(max = 200) String numericResult,
        @Size(max = 800) String starSituation,
        @Size(max = 800) String starTask,
        @Size(max = 800) String starAction,
        @Size(max = 800) String starResult,
        List<@Size(max = 50) String> skills,
        LocalDate startDate,
        LocalDate endDate
) {}
