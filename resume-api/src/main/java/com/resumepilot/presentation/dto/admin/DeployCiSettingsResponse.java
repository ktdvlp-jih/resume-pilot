package com.resumepilot.presentation.dto.admin;

import java.time.Instant;

public record DeployCiSettingsResponse(
        boolean deployAiE2eEnabled,
        boolean deployE2eEnabled,
        Instant updatedAt
) {}
