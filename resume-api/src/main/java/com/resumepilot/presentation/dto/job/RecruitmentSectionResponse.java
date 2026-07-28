package com.resumepilot.presentation.dto.job;

import java.util.List;

public record RecruitmentSectionResponse(
        String title,
        List<String> jobResponsibilities,
        List<String> requiredSkills,
        List<String> preferredSkills,
        List<String> qualifications,
        String headcount
) {}
