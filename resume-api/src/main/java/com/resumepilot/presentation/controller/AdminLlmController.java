package com.resumepilot.presentation.controller;

import com.resumepilot.application.admin.LlmAdminService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.admin.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/llm")
@RequiredArgsConstructor
@Tag(name = "Admin LLM")
public class AdminLlmController {

    private final LlmAdminService llmAdminService;

    @GetMapping("/providers")
    @Operation(summary = "LLM Provider 목록")
    public ApiResponse<List<LlmProviderResponse>> listProviders() {
        return ApiResponse.ok(llmAdminService.listProviders());
    }

    @PatchMapping("/providers/{id}")
    @Operation(summary = "LLM Provider 수정 (API 키·활성화)")
    public ApiResponse<LlmProviderResponse> updateProvider(
            @PathVariable UUID id,
            @Valid @RequestBody LlmProviderUpdateRequest req) {
        return ApiResponse.ok(llmAdminService.updateProvider(id, req));
    }

    @GetMapping("/routes")
    @Operation(summary = "작업별 LLM 라우트 (failover 순서)")
    public ApiResponse<List<LlmModelRouteResponse>> listRoutes() {
        return ApiResponse.ok(llmAdminService.listRoutes());
    }

    @PatchMapping("/routes")
    @Operation(summary = "LLM 라우트 수정 (모델명·우선순위)")
    public ApiResponse<LlmModelRouteResponse> updateRoute(@Valid @RequestBody LlmModelRouteUpdateRequest req) {
        return ApiResponse.ok(llmAdminService.updateRoute(req));
    }
}
