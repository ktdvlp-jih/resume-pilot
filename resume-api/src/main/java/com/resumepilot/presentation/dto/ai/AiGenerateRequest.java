package com.resumepilot.presentation.dto.ai;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AiGenerateRequest(
        List<String> keywords,
        int rewriteLevel,
        Map<String, Object> jobAnalysis,
        UUID jobPostingId,
        List<String> sectionTitles,
        List<UUID> experienceIds,
        /** 문항별 깊게 쓸 경험 (sectionTitles와 동일 순서). 합집합은 experienceIds에 합친다. */
        List<List<UUID>> sectionExperienceIds,
        /** 0-based: only regenerate this section when set */
        Integer sectionIndex,
        List<String> existingParagraphs,
        /** 문항별 목표 글자 수 (sectionTitles와 동일 순서) */
        List<Integer> sectionTargetChars,
        /** 문항 다시 쓰기 시 사용자 추가 지시 (사실 날조 금지) */
        String userInstruction,
        /** skip detect/review after partial section regenerate */
        Boolean skipPostprocess
) {
    private static final int MAX_SECTIONS = 5;
    private static final int MAX_EXPERIENCE_POOL = 8;
    private static final int MAX_PER_SECTION = 3;
    private static final int MIN_TARGET_CHARS = 200;
    private static final int MAX_TARGET_CHARS = 4000;
    private static final int DEFAULT_TARGET_CHARS = 1200;
    private static final int MAX_USER_INSTRUCTION = 2000;

    public AiGenerateRequest {
        if (rewriteLevel < 0) rewriteLevel = 0;
        if (rewriteLevel > 100) rewriteLevel = 100;
        if (sectionTitles == null) sectionTitles = List.of();
        else if (sectionTitles.size() > MAX_SECTIONS) sectionTitles = List.copyOf(sectionTitles.subList(0, MAX_SECTIONS));
        if (experienceIds == null) experienceIds = List.of();
        if (sectionExperienceIds == null) {
            sectionExperienceIds = List.of();
        } else {
            List<List<UUID>> normalized = new ArrayList<>();
            int limit = Math.min(sectionExperienceIds.size(), MAX_SECTIONS);
            for (int i = 0; i < limit; i++) {
                List<UUID> row = sectionExperienceIds.get(i);
                if (row == null || row.isEmpty()) {
                    normalized.add(List.of());
                    continue;
                }
                LinkedHashSet<UUID> seen = new LinkedHashSet<>();
                for (UUID id : row) {
                    if (id != null) seen.add(id);
                    if (seen.size() >= MAX_PER_SECTION) break;
                }
                normalized.add(List.copyOf(seen));
            }
            sectionExperienceIds = List.copyOf(normalized);
        }
        LinkedHashSet<UUID> pool = new LinkedHashSet<>(experienceIds);
        for (List<UUID> row : sectionExperienceIds) {
            pool.addAll(row);
        }
        List<UUID> capped = new ArrayList<>();
        for (UUID id : pool) {
            if (id == null) continue;
            capped.add(id);
            if (capped.size() >= MAX_EXPERIENCE_POOL) break;
        }
        experienceIds = List.copyOf(capped);
        if (existingParagraphs == null) existingParagraphs = List.of();
        else if (existingParagraphs.size() > MAX_SECTIONS) {
            existingParagraphs = List.copyOf(existingParagraphs.subList(0, MAX_SECTIONS));
        }
        if (sectionTargetChars == null) {
            sectionTargetChars = List.of();
        } else {
            sectionTargetChars = sectionTargetChars.stream()
                    .limit(MAX_SECTIONS)
                    .map(AiGenerateRequest::clampChars)
                    .toList();
        }
        if (userInstruction != null) {
            userInstruction = userInstruction.trim();
            if (userInstruction.length() > MAX_USER_INSTRUCTION) {
                userInstruction = userInstruction.substring(0, MAX_USER_INSTRUCTION);
            }
            if (userInstruction.isEmpty()) userInstruction = null;
        }
        if (sectionIndex != null && (sectionIndex < 0 || sectionIndex >= MAX_SECTIONS)) {
            sectionIndex = null;
        }
        if (skipPostprocess == null) skipPostprocess = false;
    }

    private static int clampChars(Integer n) {
        if (n == null) return DEFAULT_TARGET_CHARS;
        return Math.min(MAX_TARGET_CHARS, Math.max(MIN_TARGET_CHARS, n));
    }
}
