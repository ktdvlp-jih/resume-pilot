package com.resumepilot.presentation.dto.style;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record WritingStyleResponse(
        UUID id,
        List<String> frequentWords,
        BigDecimal avgSentenceLength,
        Boolean usesFormalSpeech,
        String sentenceStyle,
        String expressionStyle,
        List<String> connectors,
        String tone,
        Map<String, Object> analysisJson,
        List<String> sourceResumeIds,
        Instant updatedAt
) {}
