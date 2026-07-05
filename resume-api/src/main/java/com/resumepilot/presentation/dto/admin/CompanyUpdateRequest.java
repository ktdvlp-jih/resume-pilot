package com.resumepilot.presentation.dto.admin;

import java.util.List;

public record CompanyUpdateRequest(
        List<String> coreValues,
        List<String> talentProfile,
        List<String> techStack,
        String culture,
        List<String> hiringKeywords
) {}
