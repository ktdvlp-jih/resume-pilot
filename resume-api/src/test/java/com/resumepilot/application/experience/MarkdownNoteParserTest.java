package com.resumepilot.application.experience;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MarkdownNoteParserTest {

    private final MarkdownNoteParser parser = new MarkdownNoteParser();

    @Test
    void parsesFrontmatterTitleAndTags() {
        String md = """
                ---
                title: 사이드 프로젝트
                tags: [react, spring]
                ---
                # 무시되는 제목
                본문 첫 줄입니다.
                """;
        MarkdownNoteParser.ParsedNote note = parser.parse("projects/app.md", md);
        assertThat(note.title()).isEqualTo("사이드 프로젝트");
        assertThat(note.body()).contains("본문 첫 줄");
        assertThat(note.tags()).containsExactly("react", "spring");
    }

    @Test
    void fallsBackToHeadingOrFilename() {
        MarkdownNoteParser.ParsedNote note = parser.parse("my-note.md", "# 회고\n내용");
        assertThat(note.title()).isEqualTo("회고");
        assertThat(note.body()).contains("내용");
    }
}
