package com.resumepilot.presentation.controller;

import com.resumepilot.application.job.JobPostingService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.job.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/job-postings")
@RequiredArgsConstructor
@Tag(name = "JobPosting")
public class JobPostingController {

    private final JobPostingService jobPostingService;

    @GetMapping
    @Operation(summary = "공고 목록")
    public ApiResponse<List<JobPostingResponse>> list() {
        return ApiResponse.ok(jobPostingService.list(SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "공고 상세")
    public ApiResponse<JobPostingResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(jobPostingService.get(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping("/upload")
    @Operation(summary = "공고 업로드 및 분석")
    public ApiResponse<JobPostingResponse> upload(@Valid @RequestBody JobPostingUploadRequest request) {
        return ApiResponse.ok(jobPostingService.upload(SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping(value = "/upload/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "PDF/이미지 파일 업로드 및 분석")
    public ApiResponse<JobPostingResponse> uploadFile(
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "title", required = false) String title) {
        return ApiResponse.ok(jobPostingService.uploadFile(SecurityUtils.getCurrentUserId(), file, title));
    }

    @GetMapping("/{id}/analysis")
    @Operation(summary = "공고 분석 결과")
    public ApiResponse<JobAnalysisResponse> getAnalysis(@PathVariable UUID id) {
        return ApiResponse.ok(jobPostingService.getAnalysis(SecurityUtils.getCurrentUserId(), id));
    }

    @PostMapping("/{id}/reanalyze")
    @Operation(summary = "공고 재분석")
    public ApiResponse<JobAnalysisResponse> reanalyze(@PathVariable UUID id) {
        return ApiResponse.ok(jobPostingService.reanalyze(SecurityUtils.getCurrentUserId(), id));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "공고 삭제")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        jobPostingService.delete(SecurityUtils.getCurrentUserId(), id);
        return ApiResponse.ok(null);
    }
}
