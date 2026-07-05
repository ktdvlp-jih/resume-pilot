package com.resumepilot.presentation.controller;

import com.resumepilot.application.admin.AdminService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.admin.*;
import com.resumepilot.presentation.dto.job.CompanyResponse;
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
}
