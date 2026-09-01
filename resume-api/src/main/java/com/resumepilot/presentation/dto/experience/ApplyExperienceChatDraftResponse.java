package com.resumepilot.presentation.dto.experience;

import java.util.UUID;

public record ApplyExperienceChatDraftResponse(
        ExperienceResponse experience,
        UUID sessionId
) {}
