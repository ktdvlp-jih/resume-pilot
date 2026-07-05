package com.resumepilot.presentation.dto.auth;

import java.util.UUID;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        UUID userId,
        String email,
        String role
) {}
