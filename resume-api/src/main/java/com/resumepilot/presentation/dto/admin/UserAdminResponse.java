package com.resumepilot.presentation.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record UserAdminResponse(UUID id, String email, String role, boolean enabled, Instant createdAt) {}
