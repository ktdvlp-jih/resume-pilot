package com.resumepilot.presentation.dto.admin;

import java.time.Instant;
import java.util.List;

public record GenerateLengthStatsResponse(
        int sampleCount,
        Integer unreliableFromChars,
        double unreliableThreshold,
        int minBucketN,
        int uiMinChars,
        int uiMaxChars,
        int uiDefaultChars,
        int generateMaxTokens,
        List<Bucket> buckets,
        List<Recent> recent
) {
    public record Bucket(
            int from,
            int to,
            int n,
            int ok,
            int shortCount,
            int truncated,
            int error,
            int overshoot,
            int insufficient,
            int medianOutput,
            double unreliableRate
    ) {}

    public record Recent(
            Instant createdAt,
            String model,
            String title,
            int targetChars,
            int outputChars,
            String quality
    ) {}
}
