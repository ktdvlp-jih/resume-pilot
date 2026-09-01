package com.resumepilot.presentation.controller;

import com.resumepilot.application.experience.ExperienceImportService;
import com.resumepilot.application.integration.UserIntegrationService;
import com.resumepilot.domain.integration.IntegrationProvider;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.experience.*;
import com.resumepilot.presentation.dto.integration.SaveIntegrationTokenRequest;
import com.resumepilot.presentation.dto.integration.UserIntegrationStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/experiences/import")
@RequiredArgsConstructor
@Tag(name = "ExperienceImport")
public class ExperienceImportController {

    private final UserIntegrationService userIntegrationService;
    private final ExperienceImportService experienceImportService;

    @GetMapping("/integrations")
    @Operation(summary = "Notion/GitHub 연동 상태 (토큰 마스킹)")
    public ApiResponse<List<UserIntegrationStatusResponse>> integrations() {
        return ApiResponse.ok(userIntegrationService.listStatus(SecurityUtils.getCurrentUserId()));
    }

    @PutMapping("/integrations/notion")
    @Operation(summary = "Notion 토큰 수동 저장 (OAuth 대신 Internal Integration 토큰)")
    public ApiResponse<UserIntegrationStatusResponse> saveNotion(
            @Valid @RequestBody SaveIntegrationTokenRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(userIntegrationService.saveAccessToken(
                userId, IntegrationProvider.NOTION, request.accessToken()));
    }

    @PutMapping("/integrations/github")
    @Operation(summary = "GitHub PAT 저장")
    public ApiResponse<UserIntegrationStatusResponse> saveGitHub(
            @Valid @RequestBody SaveIntegrationTokenRequest request) {
        UUID userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.ok(userIntegrationService.saveAccessToken(
                userId, IntegrationProvider.GITHUB, request.accessToken()));
    }

    @PostMapping("/notion/preview")
    @Operation(summary = "Notion 페이지 → 경험 초안 미리보기")
    public ApiResponse<List<ExperienceImportDraftResponse>> previewNotion(
            @RequestBody(required = false) ExperienceImportPreviewRequest request) {
        return ApiResponse.ok(experienceImportService.previewNotion(
                SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/github/preview")
    @Operation(summary = "GitHub 저장소 → 경험 초안 미리보기")
    public ApiResponse<List<ExperienceImportDraftResponse>> previewGitHub(
            @RequestBody(required = false) ExperienceImportPreviewRequest request) {
        return ApiResponse.ok(experienceImportService.previewGitHub(
                SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/markdown/preview")
    @Operation(summary = "Obsidian·마크다운 노트 → 경험 초안 미리보기")
    public ApiResponse<List<ExperienceImportDraftResponse>> previewMarkdown(
            @Valid @RequestBody MarkdownImportPreviewRequest request) {
        return ApiResponse.ok(experienceImportService.previewMarkdown(request));
    }

    @PostMapping("/confirm")
    @Operation(summary = "선택한 초안을 경험 라이브러리에 저장")
    public ApiResponse<List<ExperienceResponse>> confirm(
            @Valid @RequestBody ExperienceImportConfirmRequest request) {
        return ApiResponse.ok(experienceImportService.confirm(
                SecurityUtils.getCurrentUserId(), request.drafts()));
    }
}
