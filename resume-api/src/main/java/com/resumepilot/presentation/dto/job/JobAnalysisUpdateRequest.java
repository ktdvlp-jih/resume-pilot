package com.resumepilot.presentation.dto.job;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

public record JobAnalysisUpdateRequest(
        @Size(max = 300) String title,
        @Size(max = 200) String companyName,
        @Size(max = 200) String position,
        @Size(max = 4000) String jobDescription,
        List<@Size(max = 300) String> requiredSkills,
        List<@Size(max = 300) String> preferredSkills,
        List<@Size(max = 500) String> qualifications,
        List<@Size(max = 500) String> jobResponsibilities,
        List<@Size(max = 300) String> talentProfile,
        List<@Size(max = 300) String> coreCompetencies,
        List<@Size(max = 100) String> techKeywords,
        List<@Size(max = 100) String> solutionKeywords,
        List<@Size(max = 400) String> workConditions,
        List<@Size(max = 400) String> benefits,
        List<@Size(max = 400) String> hiringProcess,
        List<@Size(max = 400) String> notes,
        List<@Size(max = 400) String> orgCulture,
        List<@Valid RecruitmentSectionResponse> recruitmentSections
) {}
