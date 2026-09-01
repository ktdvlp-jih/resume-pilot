package com.resumepilot.presentation.dto.billing;

public record IntegrationSettingItemResponse(
        String key,
        String category,
        boolean secret,
        boolean configured,
        String displayValue
) {}
