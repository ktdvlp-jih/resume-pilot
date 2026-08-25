package com.resumepilot.presentation.controller;

import com.resumepilot.application.job.JobPostingService;
import com.resumepilot.application.resume.ResumeShareService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.job.PublicJobPostingResponse;
import com.resumepilot.presentation.dto.resume.PublicSharedResumeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public")
public class PublicContentController {

    private final JobPostingService jobPostingService;
    private final ResumeShareService resumeShareService;

    @GetMapping("/shared-job-postings")
    @Operation(summary = "공통 공고 캘린더(제목·기업·마감만, 원문 없음)")
    public ApiResponse<List<PublicJobPostingResponse>> listSharedJobPostings() {
        return ApiResponse.ok(jobPostingService.listSharedPublic());
    }

    @GetMapping("/shared-resumes/{token}")
    @Operation(summary = "공유 링크로 자기소개서 조회")
    public ApiResponse<PublicSharedResumeResponse> getSharedResume(@PathVariable String token) {
        return ApiResponse.ok(resumeShareService.getPublic(token));
    }
}
