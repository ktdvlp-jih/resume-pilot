package com.resumepilot.application.admin;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 문항별 생성 로그에서 목표 글자 구간별 잘림·실패 비율을 집계한다.
 * short/insufficient는 사실 부족으로 짧게 쓴 경우라 실패로 보지 않는다.
 */
public final class GenerateLengthStats {

    public static final int UI_MIN_CHARS = 200;
    public static final int UI_MAX_CHARS = 4000;
    public static final int UI_DEFAULT_CHARS = 1200;
    /** resume-ai OPERATION_MAX_TOKENS GENERATE 와 맞출 것 */
    public static final int GENERATE_MAX_TOKENS = 16384;
    public static final double UNRELIABLE_RATE = 0.35;
    public static final int MIN_BUCKET_N = 3;

    private static final int[][] BUCKETS = {
            {200, 499},
            {500, 799},
            {800, 1199},
            {1200, 1599},
            {1600, 1999},
            {2000, 2499},
            {2500, 2999},
            {3000, 4000},
    };

    private GenerateLengthStats() {}

    public record Sample(
            int targetChars,
            int outputChars,
            String quality,
            String title,
            String model,
            Instant createdAt
    ) {}

    public record BucketRow(
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

    public record Result(
            int sampleCount,
            Integer unreliableFromChars,
            List<BucketRow> buckets,
            List<Sample> recent
    ) {}

    public static boolean isUnreliable(String quality) {
        return "truncated".equals(quality) || "error".equals(quality) || "overshoot".equals(quality);
    }

    public static Result from(List<Sample> samples) {
        List<Sample> usable = samples == null ? List.of() : samples.stream()
                .filter(s -> s != null && s.targetChars() > 0)
                .filter(s -> !"skipped".equals(s.quality()))
                .toList();

        List<BucketRow> buckets = new ArrayList<>();
        Integer unreliableFrom = null;
        for (int[] range : BUCKETS) {
            int from = range[0];
            int to = range[1];
            List<Sample> in = usable.stream()
                    .filter(s -> s.targetChars() >= from && s.targetChars() <= to)
                    .toList();
            BucketRow row = bucket(from, to, in);
            buckets.add(row);
            if (unreliableFrom == null && row.n() >= MIN_BUCKET_N && row.unreliableRate() >= UNRELIABLE_RATE) {
                unreliableFrom = from;
            }
        }

        List<Sample> recent = usable.stream()
                .sorted(Comparator.comparing(Sample::createdAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(20)
                .toList();

        return new Result(usable.size(), unreliableFrom, buckets, recent);
    }

    private static BucketRow bucket(int from, int to, List<Sample> in) {
        int ok = 0, shortCount = 0, truncated = 0, error = 0, overshoot = 0, insufficient = 0;
        List<Integer> outputs = new ArrayList<>();
        for (Sample s : in) {
            outputs.add(s.outputChars());
            switch (s.quality() == null ? "" : s.quality()) {
                case "ok" -> ok++;
                case "short" -> shortCount++;
                case "truncated" -> truncated++;
                case "error" -> error++;
                case "overshoot" -> overshoot++;
                case "insufficient" -> insufficient++;
                default -> {
                    if (isUnreliable(s.quality())) {
                        error++;
                    } else {
                        ok++;
                    }
                }
            }
        }
        int n = in.size();
        int unreliable = truncated + error + overshoot;
        double rate = n == 0 ? 0 : (double) unreliable / n;
        return new BucketRow(from, to, n, ok, shortCount, truncated, error, overshoot, insufficient, median(outputs), rate);
    }

    static int median(List<Integer> values) {
        if (values == null || values.isEmpty()) {
            return 0;
        }
        List<Integer> sorted = values.stream().sorted().toList();
        return sorted.get(sorted.size() / 2);
    }
}
