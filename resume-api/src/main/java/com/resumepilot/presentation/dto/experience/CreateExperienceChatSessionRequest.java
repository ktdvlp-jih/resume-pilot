package com.resumepilot.presentation.dto.experience;

import java.util.UUID;

public record CreateExperienceChatSessionRequest(
        UUID targetExperienceId
) {}
