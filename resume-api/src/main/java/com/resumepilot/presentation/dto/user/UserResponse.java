package com.resumepilot.presentation.dto.user;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String role,
        String name,
        String phone,
        String bio,
        Instant createdAt
) {}
