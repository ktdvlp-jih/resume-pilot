package com.resumepilot.presentation.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LinkOAuthRequest(
        @NotBlank String linkToken,
        String password,
        String emailToken
) {}
