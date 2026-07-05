package com.resumepilot.presentation.dto.admin;

import java.util.UUID;

public record PromptAdminResponse(UUID id, String type, String name, String description, UUID activeVersionId) {}
