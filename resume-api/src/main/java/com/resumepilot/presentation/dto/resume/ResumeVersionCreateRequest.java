package com.resumepilot.presentation.dto.resume;

import jakarta.validation.constraints.NotBlank;

public record ResumeVersionCreateRequest(@NotBlank String content) {}
