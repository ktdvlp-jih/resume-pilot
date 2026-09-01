package com.resumepilot.presentation.dto.billing;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record IntegrationSettingsUpdateRequest(
        @NotEmpty @Valid List<Item> items
) {
    public record Item(
            @NotBlank String key,
            String value
    ) {}
}
