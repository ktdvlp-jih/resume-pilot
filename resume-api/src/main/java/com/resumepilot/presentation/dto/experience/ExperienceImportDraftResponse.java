package com.resumepilot.presentation.dto.experience;

import com.resumepilot.domain.experience.ExperienceType;

import java.util.List;

public record ExperienceImportDraftResponse(
        String sourceKey,
        ExperienceType type,
        String title,
        String description,
        String role,
        List<String> skills
) {}
