package com.resumepilot.presentation.controller;

import com.resumepilot.application.experience.ExperienceService;
import com.resumepilot.domain.experience.ExperienceType;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.experience.ExperienceCreateRequest;
import com.resumepilot.presentation.dto.experience.ExperienceResponse;
import com.resumepilot.presentation.dto.experience.ExperienceUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/experiences")
@RequiredArgsConstructor
@Tag(name = "Experience")
public class ExperienceController {

    private final ExperienceService experienceService;

    @GetMapping
    @Operation(summary = "경험 목록")
    public ApiResponse<List<ExperienceResponse>> list(@RequestParam(required = false) ExperienceType type) {
        return ApiResponse.ok(experienceService.list(SecurityUtils.getCurrentUserId(), type));
    }

    @GetMapping("/{id}")
    @Operation(summary = "경험 상세")
    public ApiResponse<ExperienceResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(experienceService.get(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping
    @Operation(summary = "경험 생성")
    public ApiResponse<ExperienceResponse> create(@Valid @RequestBody ExperienceCreateRequest request) {
        return ApiResponse.ok(experienceService.create(SecurityUtils.getCurrentUserId(), request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "경험 수정")
    public ApiResponse<ExperienceResponse> update(@PathVariable UUID id, @RequestBody ExperienceUpdateRequest request) {
        return ApiResponse.ok(experienceService.update(SecurityUtils.getCurrentUserId(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "경험 삭제")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        experienceService.delete(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/embed")
    @Operation(summary = "경험 임베딩 생성 (RAG)")
    public ApiResponse<Void> embed(@PathVariable UUID id) {
        experienceService.embed(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok(null);
    }
}
