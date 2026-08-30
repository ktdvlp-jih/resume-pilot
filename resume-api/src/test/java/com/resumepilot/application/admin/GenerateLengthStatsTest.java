package com.resumepilot.application.admin;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GenerateLengthStatsTest {

    @Test
    void unreliableFromFirstBucketMeetingThreshold() {
        Instant t = Instant.parse("2026-08-30T00:00:00Z");
        List<GenerateLengthStats.Sample> samples = List.of(
                sample(400, 380, "ok", t),
                sample(400, 390, "ok", t),
                sample(400, 370, "ok", t),
                sample(1600, 400, "truncated", t),
                sample(1600, 0, "error", t),
                sample(1700, 1800, "overshoot", t)
        );
        GenerateLengthStats.Result result = GenerateLengthStats.from(samples);
        assertThat(result.unreliableFromChars()).isEqualTo(1600);
        assertThat(result.sampleCount()).isEqualTo(6);
    }

    @Test
    void shortAndInsufficientAreNotUnreliable() {
        Instant t = Instant.parse("2026-08-30T00:00:00Z");
        List<GenerateLengthStats.Sample> samples = List.of(
                sample(1600, 200, "short", t),
                sample(1600, 30, "insufficient", t),
                sample(1800, 900, "short", t)
        );
        GenerateLengthStats.Result result = GenerateLengthStats.from(samples);
        assertThat(result.unreliableFromChars()).isNull();
        GenerateLengthStats.BucketRow longBucket = result.buckets().stream()
                .filter(b -> b.from() == 1600)
                .findFirst()
                .orElseThrow();
        assertThat(longBucket.unreliableRate()).isZero();
        assertThat(longBucket.shortCount()).isEqualTo(2);
        assertThat(longBucket.insufficient()).isEqualTo(1);
    }

    @Test
    void sanitizeSkipsKeptParagraphs() {
        List<Map<String, Object>> rows = GenerateLogMetadata.sanitizeSections(List.of(
                Map.of("generated", false, "title", "지원동기", "target_chars", 800, "output_chars", 700, "quality", "ok", "status", "ok"),
                Map.of("generated", true, "title", "직무역량", "target_chars", 1200, "output_chars", 1100, "quality", "ok", "status", "ok")
        ));
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("title")).isEqualTo("직무역량");
        assertThat(rows.get(0)).doesNotContainKey("content");
    }

    private static GenerateLengthStats.Sample sample(int target, int output, String quality, Instant t) {
        return new GenerateLengthStats.Sample(target, output, quality, "문항", "deepseek-v4-flash", t);
    }
}
