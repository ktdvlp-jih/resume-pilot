package com.resumepilot.presentation.controller;

import com.resumepilot.application.style.WritingStyleService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.style.WritingStyleAnalyzeRequest;
import com.resumepilot.presentation.dto.style.WritingStyleResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/writing-styles")
@RequiredArgsConstructor
@Tag(name = "WritingStyle")
public class WritingStyleController {

    private final WritingStyleService writingStyleService;

    @GetMapping("/me")
    @Operation(summary = "내 문체 분석 결과")
    public ApiResponse<WritingStyleResponse> getMyStyle() {
        return ApiResponse.ok(writingStyleService.getLatest(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/analyze")
    @Operation(summary = "자기소개서 문체 분석")
    public ApiResponse<WritingStyleResponse> analyze(@Valid @RequestBody WritingStyleAnalyzeRequest request) {
        return ApiResponse.ok(writingStyleService.analyze(SecurityUtils.getCurrentUserId(), request));
    }
}
