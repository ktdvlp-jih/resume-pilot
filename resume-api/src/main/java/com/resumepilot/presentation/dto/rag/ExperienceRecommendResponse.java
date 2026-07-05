package com.resumepilot.presentation.dto.rag;

import java.util.UUID;

public record ExperienceRecommendResponse(
        UUID id,
        String title,
        String type,
        String description,
        String result,
        double score
) {}
