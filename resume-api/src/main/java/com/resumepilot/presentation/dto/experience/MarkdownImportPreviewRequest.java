package com.resumepilot.presentation.dto.experience;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MarkdownImportPreviewRequest(
        @NotEmpty List<@Valid MarkdownFileItem> files) {

    public record MarkdownFileItem(
            String filename,
            @NotBlank String content) {}
}
