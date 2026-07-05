package com.resumepilot.presentation.dto.ai;

import java.util.List;

public record AiKeywordCompareRequest(List<String> jobKeywords, String resumeContent) {}
