package com.resumepilot.presentation.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record SkillCatalogCreateRequest(@NotBlank String name, @NotBlank String category) {}
