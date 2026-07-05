package com.resumepilot.presentation.dto.user;

public record UserUpdateRequest(
        String name,
        String phone,
        String bio,
        CareerPortfolioDto careerPortfolio
) {}
