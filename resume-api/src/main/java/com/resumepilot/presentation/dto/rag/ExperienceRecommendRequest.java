package com.resumepilot.presentation.dto.rag;

import java.util.List;

public record ExperienceRecommendRequest(List<String> keywords, int topK, Double minScore) {
    /** cosine similarity 하한 — 미만은 공고 관련성 부족으로 제외 */
    public static final double DEFAULT_MIN_SCORE = 0.40;

    public ExperienceRecommendRequest {
        if (topK <= 0) topK = 5;
        if (topK > 5) topK = 5;
        if (minScore == null) minScore = DEFAULT_MIN_SCORE;
        if (minScore < 0) minScore = 0.0;
        if (minScore > 1) minScore = 1.0;
    }

    public ExperienceRecommendRequest(List<String> keywords, int topK) {
        this(keywords, topK, DEFAULT_MIN_SCORE);
    }
}
