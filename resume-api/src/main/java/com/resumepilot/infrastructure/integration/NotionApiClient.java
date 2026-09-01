package com.resumepilot.infrastructure.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotionApiClient {

    private static final String BASE = "https://api.notion.com";
    private static final String NOTION_VERSION = "2022-06-28";
    private static final Pattern PAGE_ID_IN_URL = Pattern.compile(
            "([0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");

    private final WebClient.Builder webClientBuilder;

    public record NotionPagePlain(String pageId, String title, String plainText) {}

    public NotionPagePlain fetchPagePlain(String token, String pageIdOrUrl) {
        String pageId = normalizePageId(pageIdOrUrl);
        if (pageId == null || pageId.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Notion pageId 또는 pageUrl이 필요합니다");
        }
        try {
            JsonNode page = client(token)
                    .get()
                    .uri(BASE + "/v1/pages/{id}", pageId)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            String title = extractTitle(page);
            StringBuilder body = new StringBuilder();
            collectBlockPlain(token, pageId, body, 0);
            String plain = body.toString().trim();
            if (plain.length() > 2000) {
                plain = plain.substring(0, 2000);
            }
            return new NotionPagePlain(pageId, title.isBlank() ? "미기재" : title, plain.isBlank() ? "미기재" : plain);
        } catch (WebClientResponseException ex) {
            log.warn("Notion API failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion API 호출에 실패했습니다");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Notion fetch failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion 페이지를 가져오지 못했습니다");
        }
    }

    public List<NotionPagePlain> searchRecentPages(String token, int limit) {
        try {
            JsonNode res = client(token)
                    .post()
                    .uri(BASE + "/v1/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of(
                            "filter", Map.of("property", "object", "value", "page"),
                            "page_size", Math.min(Math.max(limit, 1), 10)
                    ))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            List<NotionPagePlain> out = new ArrayList<>();
            if (res == null || !res.has("results")) {
                return out;
            }
            for (JsonNode item : res.get("results")) {
                if (!"page".equals(text(item, "object"))) {
                    continue;
                }
                String id = text(item, "id");
                if (id.isBlank()) {
                    continue;
                }
                out.add(fetchPagePlain(token, id));
            }
            return out;
        } catch (WebClientResponseException ex) {
            log.warn("Notion search failed: {}", ex.getStatusCode());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "Notion 검색에 실패했습니다");
        }
    }

    public static String normalizePageId(String pageIdOrUrl) {
        if (pageIdOrUrl == null || pageIdOrUrl.isBlank()) {
            return null;
        }
        String raw = pageIdOrUrl.trim();
        // Prefer last UUID-like segment in URL
        Matcher dashed = PAGE_ID_IN_URL.matcher(raw);
        String found = null;
        while (dashed.find()) {
            found = dashed.group(1);
        }
        if (found != null) {
            return found.contains("-") ? found : insertDashes(found);
        }
        if (raw.matches("[0-9a-fA-F]{32}")) {
            return insertDashes(raw);
        }
        return raw;
    }

    private void collectBlockPlain(String token, String blockId, StringBuilder out, int depth) {
        if (depth > 3) {
            return;
        }
        JsonNode children = client(token)
                .get()
                .uri(BASE + "/v1/blocks/{id}/children?page_size=100", blockId)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();
        if (children == null || !children.has("results")) {
            return;
        }
        for (JsonNode block : children.get("results")) {
            String type = text(block, "type");
            JsonNode typed = block.get(type);
            if (typed != null && typed.has("rich_text")) {
                String line = richTextPlain(typed.get("rich_text"));
                if (!line.isBlank()) {
                    if (!out.isEmpty()) {
                        out.append('\n');
                    }
                    out.append(line);
                }
            }
            if (block.path("has_children").asBoolean(false)) {
                String id = text(block, "id");
                if (!id.isBlank()) {
                    collectBlockPlain(token, id, out, depth + 1);
                }
            }
        }
    }

    private String extractTitle(JsonNode page) {
        if (page == null) {
            return "";
        }
        JsonNode props = page.get("properties");
        if (props == null) {
            return "";
        }
        for (JsonNode prop : props) {
            if (!"title".equals(text(prop, "type"))) {
                continue;
            }
            return richTextPlain(prop.get("title"));
        }
        return "";
    }

    private static String richTextPlain(JsonNode richText) {
        if (richText == null || !richText.isArray()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (JsonNode item : richText) {
            String t = text(item, "plain_text");
            if (!t.isEmpty()) {
                sb.append(t);
            }
        }
        return sb.toString().trim();
    }

    private static String text(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return "";
        }
        return node.get(field).asText("");
    }

    private static String insertDashes(String hex32) {
        String h = hex32.toLowerCase();
        return h.substring(0, 8) + "-" + h.substring(8, 12) + "-" + h.substring(12, 16)
                + "-" + h.substring(16, 20) + "-" + h.substring(20);
    }

    private WebClient client(String token) {
        return webClientBuilder.build().mutate()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .defaultHeader("Notion-Version", NOTION_VERSION)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
