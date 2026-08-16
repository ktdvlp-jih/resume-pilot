package com.resumepilot.presentation.dto.ai;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AiSectionAnalysisRequest(
        @NotEmpty List<String> sectionTitles
) {
    private static final int MAX_SECTIONS = 5;

    public AiSectionAnalysisRequest {
        if (sectionTitles == null) {
            sectionTitles = List.of();
        } else if (sectionTitles.size() > MAX_SECTIONS) {
            sectionTitles = List.copyOf(sectionTitles.subList(0, MAX_SECTIONS));
        }
    }
}
