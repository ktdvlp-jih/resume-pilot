package com.resumepilot.presentation.dto.rag;

import java.util.List;

public record ExperienceRecommendRequest(List<String> keywords, int topK) {
    public ExperienceRecommendRequest {
        if (topK <= 0) topK = 5;
    }
}
