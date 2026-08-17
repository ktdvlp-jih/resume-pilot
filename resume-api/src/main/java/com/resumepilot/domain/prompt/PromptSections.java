package com.resumepilot.domain.prompt;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * System prompt sections: Persona / Guard / Skill / Rubric / Task / Output.
 * Stored separately in DB; composed into {@code system_prompt} for prompt-service.
 * Empty Skill·Rubric bodies omit their headers.
 */
public final class PromptSections {

    private static final String PERSONA_HEADER = "[Persona · 페르소나]";
    private static final String GUARD_HEADER = "[Guard · 가드레일]";
    private static final String SKILL_HEADER = "[Skill · 스킬]";
    private static final String RUBRIC_HEADER = "[Rubric · 자소서 문체]";
    private static final String TASK_HEADER = "[Task · 작업]";
    private static final String OUTPUT_HEADER = "[Output · 출력]";

    private static final String SECTION_NAMES = "Persona|Guard|Skill|Rubric|Task|Output";

    private static final Pattern PERSONA = sectionPattern("Persona");
    private static final Pattern GUARD = sectionPattern("Guard");
    private static final Pattern SKILL = sectionPattern("Skill");
    private static final Pattern RUBRIC = sectionPattern("Rubric");
    private static final Pattern TASK = sectionPattern("Task");
    private static final Pattern OUTPUT = sectionPattern("Output");

    private PromptSections() {}

    public record Parsed(
            String persona,
            String guard,
            String skill,
            String rubric,
            String task,
            String output
    ) {}

    public static String compose(String persona, String guard, String task, String output) {
        return compose(persona, guard, "", "", task, output);
    }

    public static String compose(
            String persona,
            String guard,
            String skill,
            String rubric,
            String task,
            String output
    ) {
        List<String> parts = new ArrayList<>();
        parts.add(joinSection(PERSONA_HEADER, persona));
        parts.add(joinSection(GUARD_HEADER, guard));
        if (!nullToEmpty(skill).isBlank()) {
            parts.add(joinSection(SKILL_HEADER, skill));
        }
        if (!nullToEmpty(rubric).isBlank()) {
            parts.add(joinSection(RUBRIC_HEADER, rubric));
        }
        parts.add(joinSection(TASK_HEADER, task));
        parts.add(joinSection(OUTPUT_HEADER, output));
        return String.join("\n\n", parts);
    }

    public static Parsed parse(String systemPrompt) {
        if (systemPrompt == null || systemPrompt.isBlank()) {
            return new Parsed("", "", "", "", "", "");
        }
        if (!systemPrompt.contains("[Persona") && !systemPrompt.contains("[Guard")
                && !systemPrompt.contains("[Skill") && !systemPrompt.contains("[Rubric")
                && !systemPrompt.contains("[Task") && !systemPrompt.contains("[Output")) {
            return new Parsed("", "", "", "", systemPrompt.trim(), "");
        }
        return new Parsed(
                extract(PERSONA, systemPrompt),
                extract(GUARD, systemPrompt),
                extract(SKILL, systemPrompt),
                extract(RUBRIC, systemPrompt),
                extract(TASK, systemPrompt),
                extract(OUTPUT, systemPrompt)
        );
    }

    public static Parsed resolve(
            String persona,
            String guard,
            String skill,
            String rubric,
            String task,
            String output,
            String systemPrompt
    ) {
        if (persona != null || guard != null || skill != null || rubric != null
                || task != null || output != null) {
            return new Parsed(
                    nullToEmpty(persona),
                    nullToEmpty(guard),
                    nullToEmpty(skill),
                    nullToEmpty(rubric),
                    nullToEmpty(task),
                    nullToEmpty(output)
            );
        }
        return parse(systemPrompt);
    }

    public static Parsed resolve(String persona, String guard, String task, String output, String systemPrompt) {
        return resolve(persona, guard, null, null, task, output, systemPrompt);
    }

    private static String joinSection(String header, String body) {
        return header + "\n" + nullToEmpty(body).trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static Pattern sectionPattern(String name) {
        return Pattern.compile(
                "\\[" + name + "[^\\]]*\\]\\s*\\n?(.*?)(?=\\n\\[(?:" + SECTION_NAMES + ")|\\Z)",
                Pattern.DOTALL);
    }

    private static String extract(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }
}
