package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record UserRoleUpdateRequest(@NotBlank String role) {}
