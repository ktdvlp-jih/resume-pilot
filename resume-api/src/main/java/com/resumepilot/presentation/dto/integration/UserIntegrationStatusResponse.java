package com.resumepilot.presentation.dto.integration;

public record UserIntegrationStatusResponse(
        String provider,
        boolean configured,
        String accessTokenMasked,
        String externalUserId
) {}
