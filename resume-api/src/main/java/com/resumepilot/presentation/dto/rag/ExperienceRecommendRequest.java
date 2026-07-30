package com.resumepilot.presentation.dto.rag;

import java.util.List;

public record ExperienceRecommendRequest(List<String> keywords, int topK, Double minScore) {
    /** cosine similarity 하한 — 미만은 공고 관련성 부족으로 제외 (0.28 ≈ 사용 가능 폭) */
    public static final double DEFAULT_MIN_SCORE = 0.28;
    /** RAG·라이브러리 상한에 맞춤 (생성 선택 상한 5와 별개) */
    public static final int MAX_TOP_K = 30;

    public ExperienceRecommendRequest {
        if (topK <= 0) topK = 20;
        if (topK > MAX_TOP_K) topK = MAX_TOP_K;
        if (minScore == null) minScore = DEFAULT_MIN_SCORE;
        if (minScore < 0) minScore = 0.0;
        if (minScore > 1) minScore = 1.0;
    }

    public ExperienceRecommendRequest(List<String> keywords, int topK) {
        this(keywords, topK, DEFAULT_MIN_SCORE);
    }
}
