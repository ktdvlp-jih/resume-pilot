package com.resumepilot.presentation.controller;

import com.resumepilot.application.ai.AiOrchestrationService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.ai.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
@Tag(name = "AI")
public class AiController {

    private final AiOrchestrationService aiService;

    @PostMapping("/generate")
    @Operation(summary = "자기소개서 AI 생성")
    public ApiResponse<Map<String, Object>> generate(@Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.ok(aiService.generate(SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/detect")
    @Operation(summary = "AI 흔적 탐지")
    public ApiResponse<Map<String, Object>> detect(@Valid @RequestBody AiContentRequest request) {
        return ApiResponse.ok(aiService.detect(SecurityUtils.getCurrentUserId(), request.content()));
    }

    @PostMapping("/review")
    @Operation(summary = "AI 첨삭")
    public ApiResponse<Map<String, Object>> review(@Valid @RequestBody AiReviewRequest request) {
        return ApiResponse.ok(aiService.review(SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/interview-questions")
    @Operation(summary = "면접 질문 생성")
    public ApiResponse<Map<String, Object>> interview(@Valid @RequestBody AiContentRequest request) {
        return ApiResponse.ok(aiService.interviewQuestions(SecurityUtils.getCurrentUserId(), request.content()));
    }

    @PostMapping("/compare-keywords")
    @Operation(summary = "키워드 비교")
    public ApiResponse<Map<String, Object>> compareKeywords(@Valid @RequestBody AiKeywordCompareRequest request) {
        return ApiResponse.ok(aiService.compareKeywords(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/generations")
    @Operation(summary = "내 AI 생성 이력")
    public ApiResponse<List<AiGenerationResponse>> myGenerations() {
        return ApiResponse.ok(aiService.myGenerations(SecurityUtils.getCurrentUserId()));
    }
}
