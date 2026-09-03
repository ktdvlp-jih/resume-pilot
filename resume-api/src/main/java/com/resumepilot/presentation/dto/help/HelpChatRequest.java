package com.resumepilot.presentation.dto.help;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record HelpChatRequest(
        @NotBlank @Size(max = 1000) String message,
        List<HistoryItem> history,
        @Size(max = 200) String pagePath,
        @Size(max = 100) String pageLabel
) {
    public record HistoryItem(
            @NotBlank String role,
            @NotBlank @Size(max = 2000) String content
    ) {}
}
