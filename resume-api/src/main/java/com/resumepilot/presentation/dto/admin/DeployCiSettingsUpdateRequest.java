package com.resumepilot.presentation.dto.admin;

public record DeployCiSettingsUpdateRequest(
        Boolean deployAiE2eEnabled,
        Boolean deployE2eEnabled
) {}
