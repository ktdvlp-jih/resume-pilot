package com.resumepilot.presentation.controller;

import com.resumepilot.application.admin.AdminService;
import com.resumepilot.application.job.JobPostingService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.admin.*;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import com.resumepilot.presentation.dto.job.JobPostingResponse;
import com.resumepilot.presentation.dto.job.JobPostingShareRequest;
import com.resumepilot.presentation.dto.job.JobPostingUploadRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;
    private final JobPostingService jobPostingService;

    @GetMapping("/prompts")
    public ApiResponse<List<PromptAdminResponse>> listPrompts() {
        return ApiResponse.ok(adminService.listPrompts());
    }

    @GetMapping("/prompts/{templateId}/versions")
    public ApiResponse<List<PromptVersionResponse>> listPromptVersions(@PathVariable UUID templateId) {
        return ApiResponse.ok(adminService.listPromptVersions(templateId));
    }

    @PostMapping("/prompts/{templateId}/versions")
    public ApiResponse<PromptVersionResponse> createPromptVersion(
            @PathVariable UUID templateId,
            @Valid @RequestBody PromptVersionCreateRequest req) {
        return ApiResponse.ok(adminService.createPromptVersion(templateId, req, SecurityUtils.getCurrentUserId()));
    }

    @PutMapping("/prompts/{templateId}/versions/{versionId}/activate")
    public ApiResponse<PromptVersionResponse> activatePromptVersion(
            @PathVariable UUID templateId, @PathVariable UUID versionId) {
        return ApiResponse.ok(adminService.activatePromptVersion(templateId, versionId, SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/prompts/test")
    public ApiResponse<PromptTestResponse> testPrompt(@Valid @RequestBody PromptTestRequest req) {
        return ApiResponse.ok(adminService.testPrompt(req));
    }

    @GetMapping("/forbidden-expressions")
    public ApiResponse<List<ForbiddenExpressionResponse>> listForbidden() {
        return ApiResponse.ok(adminService.listForbidden());
    }

    @PostMapping("/forbidden-expressions")
    public ApiResponse<ForbiddenExpressionResponse> createForbidden(@Valid @RequestBody ForbiddenCreateRequest req) {
        return ApiResponse.ok(adminService.createForbidden(req));
    }

    @DeleteMapping("/forbidden-expressions/{id}")
    public ApiResponse<Void> deleteForbidden(@PathVariable UUID id) {
        adminService.deleteForbidden(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/users")
    public ApiResponse<List<UserAdminResponse>> listUsers() {
        return ApiResponse.ok(adminService.listUsers());
    }

    @PostMapping("/users")
    @Operation(summary = "계정 생성 (권한 지정)")
    public ApiResponse<UserAdminResponse> createUser(@Valid @RequestBody AdminUserCreateRequest req) {
        return ApiResponse.ok(adminService.createUser(req));
    }

    @PatchMapping("/users/{id}")
    @Operation(summary = "사용자 프로필·로그인 정보 수정")
    public ApiResponse<UserAdminResponse> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody AdminUserUpdateRequest req) {
        return ApiResponse.ok(adminService.updateUser(id, req));
    }

    @PatchMapping("/users/{id}/role")
    public ApiResponse<UserAdminResponse> updateUserRole(
            @PathVariable UUID id, @Valid @RequestBody UserRoleUpdateRequest req) {
        return ApiResponse.ok(adminService.updateUserRole(id, req));
    }

    @PatchMapping("/users/{id}/enabled")
    public ApiResponse<UserAdminResponse> updateUserEnabled(
            @PathVariable UUID id, @Valid @RequestBody UserEnabledUpdateRequest req) {
        return ApiResponse.ok(adminService.updateUserEnabled(id, req));
    }

    @GetMapping("/companies")
    public ApiResponse<List<CompanyResponse>> listCompanies() {
        return ApiResponse.ok(adminService.listCompanies());
    }

    @PatchMapping("/companies/{id}")
    public ApiResponse<CompanyResponse> updateCompany(
            @PathVariable UUID id, @Valid @RequestBody CompanyUpdateRequest req) {
        return ApiResponse.ok(adminService.updateCompany(id, req));
    }

    @GetMapping("/ai-logs")
    public ApiResponse<List<AiLogResponse>> listAiLogs() {
        return ApiResponse.ok(adminService.listAiLogs());
    }

    @GetMapping("/skill-catalog")
    public ApiResponse<List<SkillCatalogAdminResponse>> listSkillCatalog() {
        return ApiResponse.ok(adminService.listSkillCatalog());
    }

    @PostMapping("/skill-catalog")
    public ApiResponse<SkillCatalogAdminResponse> createSkillCatalog(@Valid @RequestBody SkillCatalogCreateRequest req) {
        return ApiResponse.ok(adminService.createSkillCatalog(req));
    }

    @PatchMapping("/skill-catalog/{id}")
    public ApiResponse<SkillCatalogAdminResponse> updateSkillCatalog(
            @PathVariable Long id, @Valid @RequestBody SkillCatalogUpdateRequest req) {
        return ApiResponse.ok(adminService.updateSkillCatalog(id, req));
    }

    @DeleteMapping("/skill-catalog/{id}")
    public ApiResponse<Void> deleteSkillCatalog(@PathVariable Long id) {
        adminService.deleteSkillCatalog(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/job-postings")
    @Operation(summary = "전체 공고 목록 (공통 공개 여부 관리)")
    public ApiResponse<List<AdminJobPostingResponse>> listJobPostings() {
        return ApiResponse.ok(jobPostingService.listAllForAdmin());
    }

    @PostMapping("/job-postings/upload")
    @Operation(summary = "공통 공고 업로드 및 분석")
    public ApiResponse<JobPostingResponse> uploadSharedJobPosting(
            @Valid @RequestBody JobPostingUploadRequest request) {
        return ApiResponse.ok(jobPostingService.uploadShared(SecurityUtils.getCurrentUserId(), request));
    }

    @PatchMapping("/job-postings/{id}/share")
    @Operation(summary = "공고 공통 공개 여부 변경")
    public ApiResponse<AdminJobPostingResponse> setJobPostingShared(
            @PathVariable UUID id,
            @Valid @RequestBody JobPostingShareRequest request) {
        return ApiResponse.ok(jobPostingService.setSharedAdmin(id, request.shared()));
    }

    @DeleteMapping("/job-postings/{id}")
    @Operation(summary = "공고 삭제")
    public ApiResponse<Void> deleteJobPosting(@PathVariable UUID id) {
        jobPostingService.deleteAdmin(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/deploy-ci-settings")
    @Operation(summary = "배포 CI 설정 조회 (E2E / AI E2E)")
    public ApiResponse<DeployCiSettingsResponse> getDeployCiSettings() {
        return ApiResponse.ok(adminService.getDeployCiSettings());
    }

    @PatchMapping("/deploy-ci-settings")
    @Operation(summary = "배포 CI 설정 변경")
    public ApiResponse<DeployCiSettingsResponse> updateDeployCiSettings(
            @RequestBody DeployCiSettingsUpdateRequest req) {
        return ApiResponse.ok(adminService.updateDeployCiSettings(req, SecurityUtils.getCurrentUserId()));
    }
}
