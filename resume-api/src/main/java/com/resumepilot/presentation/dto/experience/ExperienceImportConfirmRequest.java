package com.resumepilot.presentation.dto.experience;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ExperienceImportConfirmRequest(
        @NotEmpty List<@Valid ExperienceCreateRequest> drafts
) {}
