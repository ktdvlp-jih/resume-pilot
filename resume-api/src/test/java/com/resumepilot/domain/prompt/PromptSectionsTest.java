package com.resumepilot.domain.prompt;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PromptSectionsTest {

    @Test
    void composeAndParseRoundTrip() {
        String persona = "당신은 자소서 코치입니다.";
        String guard = "경험을 지어내지 마세요.";
        String task = "공고에 맞게 작성하세요.";
        String output = "한국어 본문만 출력.";

        String composed = PromptSections.compose(persona, guard, task, output);
        PromptSections.Parsed parsed = PromptSections.parse(composed);

        assertThat(parsed.persona()).isEqualTo(persona);
        assertThat(parsed.guard()).isEqualTo(guard);
        assertThat(parsed.task()).isEqualTo(task);
        assertThat(parsed.output()).isEqualTo(output);
        assertThat(composed).contains("[Persona · 페르소나]");
        assertThat(composed).contains("[Guard · 가드레일]");
    }

    @Test
    void parseLegacyMonolithicPrompt() {
        PromptSections.Parsed parsed = PromptSections.parse("You rewrite cover letters using ONLY user experiences.");
        assertThat(parsed.persona()).isEmpty();
        assertThat(parsed.guard()).isEmpty();
        assertThat(parsed.task()).isEqualTo("You rewrite cover letters using ONLY user experiences.");
        assertThat(parsed.output()).isEmpty();
    }
}
