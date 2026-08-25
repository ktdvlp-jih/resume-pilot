package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record AdminUserUpdateRequest(
        @Email String email,
        String name,
        String phone,
        @Size(min = 8, max = 100) String password
) {}
