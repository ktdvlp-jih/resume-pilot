package com.resumepilot.presentation.dto.job;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record JobAnalysisResponse(
        UUID id,
        UUID jobPostingId,
        String companyName,
        String position,
        List<String> requiredSkills,
        List<String> preferredSkills,
        List<String> qualifications,
        List<String> jobResponsibilities,
        List<String> talentProfile,
        List<String> coreCompetencies,
        List<String> techKeywords,
        String jobDescription,
        String orgCulture,
        BigDecimal fitScore,
        Map<String, Object> analysisJson,
        Instant createdAt
) {}
