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
    public AiGenerateRequest {
        if (rewriteLevel < 0) rewriteLevel = 0;
        if (rewriteLevel > 100) rewriteLevel = 100;
        if (sectionTitles == null) sectionTitles = List.of();
        if (experienceIds == null) experienceIds = List.of();
    }
}
