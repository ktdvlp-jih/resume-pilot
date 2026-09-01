package com.resumepilot.application.experience;

import com.resumepilot.application.integration.UserIntegrationService;
import com.resumepilot.domain.experience.ExperienceType;
import com.resumepilot.domain.integration.IntegrationProvider;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.integration.GitHubApiClient;
import com.resumepilot.infrastructure.integration.NotionApiClient;
import com.resumepilot.presentation.dto.experience.ExperienceCreateRequest;
import com.resumepilot.presentation.dto.experience.ExperienceImportDraftResponse;
import com.resumepilot.presentation.dto.experience.ExperienceImportPreviewRequest;
import com.resumepilot.presentation.dto.experience.ExperienceResponse;
import com.resumepilot.presentation.dto.experience.MarkdownImportPreviewRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExperienceImportService {

    private final UserIntegrationService userIntegrationService;
    private final NotionApiClient notionApiClient;
    private final GitHubApiClient gitHubApiClient;
    private final MarkdownNoteParser markdownNoteParser;
    private final ExperienceService experienceService;

    public List<ExperienceImportDraftResponse> previewNotion(UUID userId, ExperienceImportPreviewRequest request) {
        String token = resolveToken(userId, IntegrationProvider.NOTION, request == null ? null : request.accessToken());
        String pageRef = firstNonBlank(
                request == null ? null : request.pageId(),
                request == null ? null : request.pageUrl());
        if (pageRef != null) {
            NotionApiClient.NotionPagePlain page = notionApiClient.fetchPagePlain(token, pageRef);
            return List.of(toNotionDraft(page));
        }
        return notionApiClient.searchRecentPages(token, 5).stream()
                .map(this::toNotionDraft)
                .toList();
    }

    public List<ExperienceImportDraftResponse> previewGitHub(UUID userId, ExperienceImportPreviewRequest request) {
        String token = resolveToken(userId, IntegrationProvider.GITHUB, request == null ? null : request.accessToken());
        String repo = request == null ? null : request.repoFullName();
        if (repo != null && !repo.isBlank()) {
            return List.of(toGitHubDraft(gitHubApiClient.fetchRepo(token, repo.trim())));
        }
        return gitHubApiClient.listUserRepos(token, 15).stream()
                .map(this::toGitHubDraft)
                .toList();
    }

    public List<ExperienceImportDraftResponse> previewMarkdown(MarkdownImportPreviewRequest request) {
        if (request == null || request.files() == null || request.files().isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "가져올 마크다운 파일이 없습니다");
        }
        List<ExperienceImportDraftResponse> drafts = new ArrayList<>();
        int index = 0;
        for (MarkdownImportPreviewRequest.MarkdownFileItem file : request.files()) {
            MarkdownNoteParser.ParsedNote note = markdownNoteParser.parse(file.filename(), file.content());
            String sourceKey = "markdown:" + sanitizeSourceKey(note.filename()) + ":" + (index++);
            drafts.add(new ExperienceImportDraftResponse(
                    sourceKey,
                    ExperienceType.PROJECT,
                    truncate(note.title(), 100),
                    truncate(note.body(), 2000),
                    "미기재",
                    note.tags().stream().limit(10).toList()));
        }
        return drafts;
    }

    @Transactional
    public List<ExperienceResponse> confirm(UUID userId, List<ExperienceCreateRequest> drafts) {
        if (drafts == null || drafts.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "확정할 초안이 없습니다");
        }
        List<ExperienceResponse> created = new ArrayList<>();
        for (ExperienceCreateRequest draft : drafts) {
            created.add(experienceService.create(userId, draft));
        }
        return created;
    }

    private String resolveToken(UUID userId, IntegrationProvider provider, String override) {
        if (override != null && !override.isBlank()) {
            return override.trim();
        }
        return userIntegrationService.requirePlainAccessToken(userId, provider);
    }

    private ExperienceImportDraftResponse toNotionDraft(NotionApiClient.NotionPagePlain page) {
        String title = blankToUnset(page.title());
        String desc = blankToUnset(page.plainText());
        return new ExperienceImportDraftResponse(
                "notion:" + page.pageId(),
                ExperienceType.PROJECT,
                truncate(title, 100),
                truncate(desc, 2000),
                "미기재",
                List.of()
        );
    }

    private ExperienceImportDraftResponse toGitHubDraft(GitHubApiClient.GitHubRepoDraft repo) {
        String title = blankToUnset(repo.name());
        String desc = firstNonBlank(repo.readmeExcerpt(), repo.description());
        desc = blankToUnset(desc);
        List<String> skills = new ArrayList<>();
        if (repo.language() != null && !repo.language().isBlank()) {
            skills.add(truncate(repo.language().trim(), 50));
        }
        return new ExperienceImportDraftResponse(
                "github:" + repo.fullName(),
                ExperienceType.PROJECT,
                truncate(title, 100),
                truncate(desc, 2000),
                "미기재",
                skills
        );
    }

    private static String blankToUnset(String value) {
        if (value == null || value.isBlank()) {
            return "미기재";
        }
        return value.trim();
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

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String sanitizeSourceKey(String filename) {
        if (filename == null || filename.isBlank()) {
            return "note";
        }
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
