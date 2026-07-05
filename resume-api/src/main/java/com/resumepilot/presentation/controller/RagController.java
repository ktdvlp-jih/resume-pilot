package com.resumepilot.presentation.controller;

import com.resumepilot.application.rag.RagService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.rag.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
@Tag(name = "RAG")
public class RagController {

    private final RagService ragService;

    @PostMapping("/search")
    @Operation(summary = "Vector 검색")
    public ApiResponse<List<Map<String, Object>>> search(@Valid @RequestBody RagSearchRequest request) {
        return ApiResponse.ok(ragService.search(SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/recommend-experiences")
    @Operation(summary = "공고 키워드 기반 경험 추천")
    public ApiResponse<List<ExperienceRecommendResponse>> recommend(@RequestBody ExperienceRecommendRequest request) {
        return ApiResponse.ok(ragService.recommendExperiences(
                SecurityUtils.getCurrentUserId(), request.keywords(), request.topK()));
    }
}
