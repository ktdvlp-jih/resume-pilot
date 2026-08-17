package com.resumepilot.domain.experience;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ExperiencePeriodTest {

    @Test
    void endedExperienceIsPast() {
        String line = ExperiencePeriod.promptLine(
                LocalDate.of(2019, 3, 1),
                LocalDate.of(2021, 8, 31));
        assertThat(line).isEqualTo("기간: 2019-03-01 ~ 2021-08-31 (종료 · 과거 경험. 현재 담당처럼 쓰지 말 것)");
    }

    @Test
    void ongoingExperienceIsPresent() {
        String line = ExperiencePeriod.promptLine(LocalDate.of(2024, 1, 1), null);
        assertThat(line).isEqualTo("기간: 2024-01-01 ~ 진행중 (현재 담당. 이 경험만 현재형 가능)");
    }

    @Test
    void missingDatesOmitted() {
        assertThat(ExperiencePeriod.promptLine(null, null)).isNull();
    }
}
