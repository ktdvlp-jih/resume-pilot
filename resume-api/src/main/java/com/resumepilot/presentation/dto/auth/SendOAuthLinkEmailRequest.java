package com.resumepilot.presentation.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record SendOAuthLinkEmailRequest(@NotBlank String linkToken) {}
