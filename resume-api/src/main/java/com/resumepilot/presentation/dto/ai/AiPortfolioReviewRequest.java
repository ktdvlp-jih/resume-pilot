package com.resumepilot.presentation.dto.ai;

import jakarta.validation.constraints.NotNull;

public record AiPortfolioReviewRequest(
        @NotNull PortfolioSectionType sectionType,
        String content
) {}
