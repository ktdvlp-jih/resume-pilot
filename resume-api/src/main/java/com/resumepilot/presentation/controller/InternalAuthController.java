package com.resumepilot.presentation.controller;

import com.resumepilot.application.auth.AuthService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.auth.ResendVerificationRequest;
import com.resumepilot.presentation.dto.auth.TokenResponse;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 스모크·E2E용 — X-Internal-Token 필요 */
@Hidden
@RestController
@RequestMapping("/api/v1/internal/auth")
@RequiredArgsConstructor
public class InternalAuthController {

    private final AuthService authService;

    @PostMapping("/force-verify-email")
    public ApiResponse<TokenResponse> forceVerifyEmail(@Valid @RequestBody ResendVerificationRequest request) {
        return ApiResponse.ok(authService.forceVerifyEmail(request.email()));
    }
}
