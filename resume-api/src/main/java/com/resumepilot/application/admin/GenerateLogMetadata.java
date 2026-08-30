package com.resumepilot.application.admin;

import com.resumepilot.presentation.dto.ai.AiGenerateRequest;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** generate AI 로그에 본문 없이 문항 글자 수만 남긴다. */
public final class GenerateLogMetadata {

    private GenerateLogMetadata() {}

    public static Map<String, Object> fromResult(AiGenerateRequest request, Map<String, Object> result) {
        Map<String, Object> meta = base(request);
        List<Map<String, Object>> sections = sanitizeSections(result != null ? result.get("sections") : null);
        if (sections.isEmpty()) {
            sections = requestedSections(request, "ok");
        }
        meta.put("sections", sections);
        return meta;
    }

    public static Map<String, Object> fromFailure(AiGenerateRequest request) {
        Map<String, Object> meta = base(request);
        meta.put("sections", requestedSections(request, "error"));
        return meta;
    }

    private static Map<String, Object> base(AiGenerateRequest request) {
        Map<String, Object> meta = new LinkedHashMap<>();
        if (request != null && request.sectionIndex() != null) {
            meta.put("section_index", request.sectionIndex());
        }
        return meta;
    }

    static List<Map<String, Object>> sanitizeSections(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> src = (Map<String, Object>) map;
            if (Boolean.FALSE.equals(src.get("generated"))) {
                continue;
            }
            String content = src.get("content") == null ? "" : String.valueOf(src.get("content"));
            int target = toInt(src.get("target_chars"), 0);
            int output = src.containsKey("output_chars") ? toInt(src.get("output_chars"), content.strip().length()) : content.strip().length();
            String status = String.valueOf(src.getOrDefault("status", "ok"));
            String quality = src.get("quality") == null
                    ? inferQuality(status, content, target)
                    : String.valueOf(src.get("quality"));
            if ("skipped".equals(quality)) {
                continue;
            }
            out.add(row(String.valueOf(src.getOrDefault("title", "")), target, output, quality, status));
        }
        return out;
    }

    static List<Map<String, Object>> requestedSections(AiGenerateRequest request, String quality) {
        if (request == null) {
            return List.of();
        }
        List<String> titles = request.sectionTitles() == null ? List.of() : request.sectionTitles();
        List<Integer> targets = request.sectionTargetChars() == null ? List.of() : request.sectionTargetChars();
        Integer only = request.sectionIndex();
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < titles.size(); i++) {
            if (only != null && only != i) {
                continue;
            }
            int target = i < targets.size() && targets.get(i) != null ? targets.get(i) : GenerateLengthStats.UI_DEFAULT_CHARS;
            out.add(row(titles.get(i), target, 0, quality, "error".equals(quality) ? "error" : "ok"));
        }
        return out;
    }

    static String inferQuality(String status, String content, int target) {
        if ("error".equals(status)) {
            return "error";
        }
        if ("skipped".equals(status)) {
            return "skipped";
        }
        String text = content == null ? "" : content.strip();
        if (text.contains("내용이 부족하여 생성하지 않음")) {
            return "insufficient";
        }
        if (text.isEmpty()) {
            return "error";
        }
        if (!looksCompleteKorean(text)) {
            return "truncated";
        }
        int cap = Math.max(1, target);
        if (text.length() > (int) (cap * 1.05)) {
            return "overshoot";
        }
        if (text.length() < Math.max(40, (int) (cap * 0.5))) {
            return "short";
        }
        return "ok";
    }

    static boolean looksCompleteKorean(String text) {
        String stripped = text.stripTrailing();
        if (stripped.length() < 20) {
            return false;
        }
        return stripped.endsWith("습니다.")
                || stripped.endsWith("니다.")
                || stripped.endsWith("다.")
                || stripped.endsWith("요.")
                || stripped.endsWith(".")
                || stripped.endsWith("!")
                || stripped.endsWith("?");
    }

    private static Map<String, Object> row(String title, int target, int output, String quality, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        String t = title == null ? "" : title;
        row.put("title", t.length() > 80 ? t.substring(0, 80) : t);
        row.put("target_chars", target);
        row.put("output_chars", output);
        row.put("quality", quality);
        row.put("status", status);
        return row;
    }

    static int toInt(Object value, int fallback) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        if (value instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }
}
