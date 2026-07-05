package com.resumepilot.presentation.dto.ai;

import java.util.Map;

public record AiReviewRequest(String content, Map<String, Object> jobAnalysis) {}
