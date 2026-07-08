package com.resumepilot.presentation.controller;

import com.resumepilot.application.admin.LlmAdminService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.internal.LlmRuntimeConfigResponse;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Hidden
@RestController
@RequestMapping("/api/v1/internal/llm")
@RequiredArgsConstructor
public class InternalLlmConfigController {

    private final LlmAdminService llmAdminService;

    @GetMapping("/runtime-config")
    public ApiResponse<LlmRuntimeConfigResponse> runtimeConfig() {
        return ApiResponse.ok(llmAdminService.getRuntimeConfig());
    }
}
