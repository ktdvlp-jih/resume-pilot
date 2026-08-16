package com.resumepilot.presentation.dto.resume;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResumeVersionCreateRequest(
        @NotBlank String content,
        @Size(max = 80) String name
) {}
