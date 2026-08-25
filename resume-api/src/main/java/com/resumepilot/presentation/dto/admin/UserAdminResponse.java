package com.resumepilot.presentation.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record UserAdminResponse(
        UUID id,
        String email,
        String role,
        String name,
        String phone,
        boolean enabled,
        Instant createdAt
) {}
