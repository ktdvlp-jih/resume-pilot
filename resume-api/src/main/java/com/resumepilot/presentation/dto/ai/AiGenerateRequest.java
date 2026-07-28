package com.resumepilot.presentation.dto.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiGenerateRequest(
        List<String> keywords,
        int rewriteLevel,
        Map<String, Object> jobAnalysis,
        UUID jobPostingId,
        List<String> sectionTitles,
        List<UUID> experienceIds
) {
    private static final int MAX_SECTIONS = 5;
    private static final int MAX_EXPERIENCES = 5;

    public AiGenerateRequest {
        if (rewriteLevel < 0) rewriteLevel = 0;
        if (rewriteLevel > 100) rewriteLevel = 100;
        if (sectionTitles == null) sectionTitles = List.of();
        else if (sectionTitles.size() > MAX_SECTIONS) sectionTitles = List.copyOf(sectionTitles.subList(0, MAX_SECTIONS));
        if (experienceIds == null) experienceIds = List.of();
        else if (experienceIds.size() > MAX_EXPERIENCES) experienceIds = List.copyOf(experienceIds.subList(0, MAX_EXPERIENCES));
    }
}
