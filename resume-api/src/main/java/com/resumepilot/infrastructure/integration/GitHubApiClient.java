package com.resumepilot.infrastructure.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GitHubApiClient {

    private static final String BASE = "https://api.github.com";

    private final WebClient.Builder webClientBuilder;

    public record GitHubRepoDraft(String fullName, String name, String description, String language, String readmeExcerpt) {}

    public List<GitHubRepoDraft> listUserRepos(String token, int limit) {
        try {
            JsonNode arr = client(token)
                    .get()
                    .uri(BASE + "/user/repos?sort=updated&per_page={n}&affiliation=owner", Math.min(Math.max(limit, 1), 30))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            List<GitHubRepoDraft> out = new ArrayList<>();
            if (arr == null || !arr.isArray()) {
                return out;
            }
            for (JsonNode repo : arr) {
                out.add(toDraft(token, repo, false));
            }
            return out;
        } catch (WebClientResponseException ex) {
            log.warn("GitHub repos failed: {}", ex.getStatusCode());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub 저장소 목록을 가져오지 못했습니다");
        }
    }

    public GitHubRepoDraft fetchRepo(String token, String fullName) {
        if (fullName == null || !fullName.contains("/")) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "repoFullName은 owner/repo 형식이어야 합니다");
        }
        String[] parts = fullName.trim().split("/", 2);
        try {
            JsonNode repo = client(token)
                    .get()
                    .uri(BASE + "/repos/{owner}/{repo}", parts[0], parts[1])
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            return toDraft(token, repo, true);
        } catch (WebClientResponseException ex) {
            log.warn("GitHub repo failed: {}", ex.getStatusCode());
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "GitHub 저장소를 가져오지 못했습니다");
        }
    }

    private GitHubRepoDraft toDraft(String token, JsonNode repo, boolean loadReadme) {
        if (repo == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "저장소를 찾을 수 없습니다");
        }
        String fullName = text(repo, "full_name");
        String name = text(repo, "name");
        String description = text(repo, "description");
        String language = text(repo, "language");
        String readme = "";
        if (loadReadme || description.isBlank()) {
            readme = fetchReadmeExcerpt(token, fullName);
        }
        return new GitHubRepoDraft(fullName, name, description, language, readme);
    }

    private String fetchReadmeExcerpt(String token, String fullName) {
        if (fullName == null || !fullName.contains("/")) {
            return "";
        }
        String[] parts = fullName.split("/", 2);
        try {
            JsonNode readme = client(token)
                    .get()
                    .uri(BASE + "/repos/{owner}/{repo}/readme", parts[0], parts[1])
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            if (readme == null) {
                return "";
            }
            String encoding = text(readme, "encoding");
            String content = text(readme, "content");
            if ("base64".equalsIgnoreCase(encoding) && !content.isBlank()) {
                byte[] decoded = Base64.getMimeDecoder().decode(content.replace("\n", ""));
                String plain = new String(decoded, StandardCharsets.UTF_8).trim();
                if (plain.length() > 2000) {
                    return plain.substring(0, 2000);
                }
                return plain;
            }
            return "";
        } catch (WebClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                return "";
            }
            log.warn("GitHub readme failed: {}", ex.getStatusCode());
            return "";
        } catch (Exception e) {
            return "";
        }
    }

    private static String text(JsonNode node, String field) {
        if (node == null || !node.has(field) || node.get(field).isNull()) {
            return "";
        }
        return node.get(field).asText("");
    }

    private WebClient client(String token) {
        return webClientBuilder.build().mutate()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .defaultHeader(HttpHeaders.USER_AGENT, "ResumePilot")
                .build();
    }
}
