package com.resumepilot.domain.experience;

import java.time.LocalDate;

/** RAG·프롬프트에 넣는 기간 한 줄. 임베딩 유사도에는 쓰지 않는다. */
public final class ExperiencePeriod {

    private ExperiencePeriod() {}

    public static String promptLine(LocalDate start, LocalDate end) {
        if (start == null && end == null) {
            return null;
        }
        String startLabel = start != null ? start.toString() : "?";
        if (end != null) {
            return "기간: " + startLabel + " ~ " + end + " (종료 · 과거 경험. 현재 담당처럼 쓰지 말 것)";
        }
        return "기간: " + startLabel + " ~ 진행중 (현재 담당. 이 경험만 현재형 가능)";
    }
}
