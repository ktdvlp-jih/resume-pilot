package com.resumepilot.application.experience;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class MarkdownNoteParser {

    private static final Pattern FRONTMATTER = Pattern.compile("^---\\s*\\n([\\s\\S]*?)\\n---\\s*\\n?", Pattern.MULTILINE);
    private static final Pattern HEADING = Pattern.compile("^#+\\s+(.+)$", Pattern.MULTILINE);

    public record ParsedNote(String filename, String title, String body, List<String> tags) {}

    public ParsedNote parse(String filename, String rawContent) {
        if (rawContent == null) {
            rawContent = "";
        }
        String content = rawContent.replace("\r\n", "\n");
        Map<String, String> frontmatter = new LinkedHashMap<>();
        Matcher fm = FRONTMATTER.matcher(content);
        if (fm.find()) {
            parseFrontmatterLines(fm.group(1), frontmatter);
            content = content.substring(fm.end());
        }
        String title = firstNonBlank(
                frontmatter.get("title"),
                extractFirstHeading(content),
                filenameToTitle(filename));
        String body = stripMarkdown(content.trim());
        List<String> tags = parseTags(frontmatter.get("tags"));
        return new ParsedNote(
                filename == null ? "note.md" : filename,
                blankToDefault(title, "미기재"),
                blankToDefault(body, "미기재"),
                tags);
    }

    private static void parseFrontmatterLines(String block, Map<String, String> out) {
        for (String line : block.split("\n")) {
            int colon = line.indexOf(':');
            if (colon <= 0) {
                continue;
            }
            String key = line.substring(0, colon).trim().toLowerCase(Locale.ROOT);
            String value = line.substring(colon + 1).trim();
            if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                value = value.substring(1, value.length() - 1);
            }
            out.put(key, value);
        }
    }

    private static List<String> parseTags(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String cleaned = raw.replace("[", "").replace("]", "");
        List<String> tags = new ArrayList<>();
        for (String part : cleaned.split("[,\\s]+")) {
            String tag = part.trim();
            if (!tag.isBlank() && tag.length() <= 50) {
                tags.add(tag);
            }
        }
        return tags;
    }

    private static String extractFirstHeading(String content) {
        Matcher m = HEADING.matcher(content);
        if (m.find()) {
            return m.group(1).trim();
        }
        return null;
    }

    private static String filenameToTitle(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        String base = filename;
        int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
        if (slash >= 0) {
            base = base.substring(slash + 1);
        }
        if (base.toLowerCase(Locale.ROOT).endsWith(".md")) {
            base = base.substring(0, base.length() - 3);
        }
        return base.replace('-', ' ').replace('_', ' ').trim();
    }

    private static String stripMarkdown(String text) {
        if (text.isBlank()) {
            return text;
        }
        String result = text;
        result = result.replaceAll("!\\[[^\\]]*]\\([^)]*\\)", "");
        result = result.replaceAll("\\[([^\\]]+)]\\([^)]*\\)", "$1");
        result = result.replaceAll("^#+\\s+", "");
        result = result.replaceAll("(?m)^[-*+]\\s+", "• ");
        result = result.replaceAll("`+", "");
        result = result.replaceAll("\\*\\*|__|\\*|_", "");
        result = result.replaceAll("\\n{3,}", "\n\n");
        return result.trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
