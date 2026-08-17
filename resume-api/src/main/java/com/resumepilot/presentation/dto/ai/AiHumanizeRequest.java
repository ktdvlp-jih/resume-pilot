package com.resumepilot.presentation.dto.ai;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record AiHumanizeRequest(
        @NotBlank String content,
        List<String> sentences
) {
    private static final int MAX_SENTENCES = 40;

    public AiHumanizeRequest {
        if (sentences == null) {
            sentences = List.of();
        } else if (sentences.size() > MAX_SENTENCES) {
            sentences = List.copyOf(sentences.subList(0, MAX_SENTENCES));
        }
    }
}
