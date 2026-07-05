package com.resumepilot.presentation.controller;

import com.resumepilot.application.resume.ResumeService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.resume.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
@Tag(name = "Resume")
public class ResumeController {

    private final ResumeService resumeService;

    @GetMapping
    @Operation(summary = "자기소개서 목록")
    public ApiResponse<List<ResumeResponse>> list() {
        return ApiResponse.ok(resumeService.list(SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "자기소개서 상세")
    public ApiResponse<ResumeResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(resumeService.get(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping
    @Operation(summary = "자기소개서 생성")
    public ApiResponse<ResumeResponse> create(@Valid @RequestBody ResumeCreateRequest request) {
        return ApiResponse.ok(resumeService.create(SecurityUtils.getCurrentUserId(), request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "자기소개서 수정")
    public ApiResponse<ResumeResponse> update(@PathVariable UUID id, @RequestBody ResumeUpdateRequest request) {
        return ApiResponse.ok(resumeService.update(SecurityUtils.getCurrentUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "자기소개서 삭제")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        resumeService.delete(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/versions")
    @Operation(summary = "새 버전 생성")
    public ApiResponse<ResumeVersionResponse> createVersion(
            @PathVariable UUID id,
            @Valid @RequestBody ResumeVersionCreateRequest request) {
        return ApiResponse.ok(resumeService.createVersion(SecurityUtils.getCurrentUserId(), id, request));
    }

    @GetMapping("/{id}/versions")
    @Operation(summary = "버전 목록")
    public ApiResponse<List<ResumeVersionResponse>> listVersions(@PathVariable UUID id) {
        return ApiResponse.ok(resumeService.listVersions(SecurityUtils.getCurrentUserId(), id));
    }

    @GetMapping("/{id}/versions/compare")
    @Operation(summary = "버전 비교")
    public ApiResponse<ResumeVersionCompareResponse> compareVersions(
            @PathVariable UUID id,
            @RequestParam int versionA,
            @RequestParam int versionB) {
        return ApiResponse.ok(resumeService.compareVersions(SecurityUtils.getCurrentUserId(), id, versionA, versionB));
    }
}
