package com.resumepilot.domain.prompt;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * System prompt sections: Persona / Guard / Task / Output.
 * Stored separately in DB; composed into {@code system_prompt} for prompt-service.
 */
public final class PromptSections {

    private static final String PERSONA_HEADER = "[Persona · 페르소나]";
    private static final String GUARD_HEADER = "[Guard · 가드레일]";
    private static final String TASK_HEADER = "[Task · 작업]";
    private static final String OUTPUT_HEADER = "[Output · 출력]";

    private static final Pattern PERSONA = sectionPattern("Persona");
    private static final Pattern GUARD = sectionPattern("Guard");
    private static final Pattern TASK = sectionPattern("Task");
    private static final Pattern OUTPUT = sectionPattern("Output");

    private PromptSections() {}

    public record Parsed(String persona, String guard, String task, String output) {}

    public static String compose(String persona, String guard, String task, String output) {
        return joinSection(PERSONA_HEADER, persona)
                + "\n\n" + joinSection(GUARD_HEADER, guard)
                + "\n\n" + joinSection(TASK_HEADER, task)
                + "\n\n" + joinSection(OUTPUT_HEADER, output);
    }

    public static Parsed parse(String systemPrompt) {
        if (systemPrompt == null || systemPrompt.isBlank()) {
            return new Parsed("", "", "", "");
        }
        if (!systemPrompt.contains("[Persona") && !systemPrompt.contains("[Guard")
                && !systemPrompt.contains("[Task") && !systemPrompt.contains("[Output")) {
            return new Parsed("", "", systemPrompt.trim(), "");
        }
        return new Parsed(
                extract(PERSONA, systemPrompt),
                extract(GUARD, systemPrompt),
                extract(TASK, systemPrompt),
                extract(OUTPUT, systemPrompt)
        );
    }

    public static Parsed resolve(String persona, String guard, String task, String output, String systemPrompt) {
        if (persona != null || guard != null || task != null || output != null) {
            return new Parsed(
                    nullToEmpty(persona),
                    nullToEmpty(guard),
                    nullToEmpty(task),
                    nullToEmpty(output)
            );
        }
        return parse(systemPrompt);
    }

    private static String joinSection(String header, String body) {
        return header + "\n" + nullToEmpty(body).trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static Pattern sectionPattern(String name) {
        return Pattern.compile(
                "\\[" + name + "[^\\]]*\\]\\s*\\n?(.*?)(?=\\n\\[(?:Persona|Guard|Task|Output)|\\Z)",
                Pattern.DOTALL);
    }

    private static String extract(Pattern pattern, String text) {
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }
}
