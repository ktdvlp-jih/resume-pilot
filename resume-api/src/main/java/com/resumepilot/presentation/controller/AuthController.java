package com.resumepilot.presentation.controller;

import com.resumepilot.application.auth.AuthService;
import com.resumepilot.application.auth.SocialOAuthService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.auth.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth")
public class AuthController {

    private final AuthService authService;
    private final SocialOAuthService socialOAuthService;

    @PostMapping("/signup")
    @Operation(summary = "회원가입")
    public ApiResponse<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.ok(authService.signup(request));
    }

    @PostMapping("/login")
    @Operation(summary = "로그인")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/verify-email")
    @Operation(summary = "이메일 인증 완료")
    public ApiResponse<TokenResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ApiResponse.ok(authService.verifyEmail(request.token()));
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "인증 메일 재발송")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request);
        return ApiResponse.ok(null);
    }

    @PostMapping("/refresh")
    @Operation(summary = "토큰 갱신")
    public ApiResponse<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PatchMapping("/password")
    @Operation(summary = "비밀번호 변경")
    public ApiResponse<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(SecurityUtils.getCurrentUserId(), request);
        return ApiResponse.ok(null);
    }

    @PostMapping("/oauth/link")
    @Operation(summary = "기존 이메일 계정에 소셜 로그인 연결 확인")
    public ApiResponse<TokenResponse> oauthLink(@Valid @RequestBody LinkOAuthRequest request) {
        return ApiResponse.ok(socialOAuthService.confirmLink(request));
    }

    @PostMapping("/oauth/link/send-email")
    @Operation(summary = "소셜 계정 연결용 이메일 인증 발송")
    public ApiResponse<Void> oauthLinkSendEmail(@Valid @RequestBody SendOAuthLinkEmailRequest request) {
        socialOAuthService.sendLinkEmail(request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/oauth/providers")
    @Operation(summary = "설정된 소셜 로그인 제공자")
    public ApiResponse<OAuthProvidersResponse> oauthProviders() {
        return ApiResponse.ok(socialOAuthService.providers());
    }

    @GetMapping("/oauth/{provider}/authorize")
    @Operation(summary = "소셜 로그인 시작 URL")
    public ApiResponse<OAuthAuthorizeResponse> oauthAuthorize(
            @PathVariable String provider,
            @RequestParam(required = false) String frontendUrl,
            @RequestParam(required = false) String returnPath,
            @RequestParam(defaultValue = "false") boolean termsAccepted,
            @RequestParam(defaultValue = "false") boolean privacyAccepted) {
        return ApiResponse.ok(socialOAuthService.buildAuthorizeUrl(
                provider, frontendUrl, returnPath, termsAccepted, privacyAccepted));
    }

    @GetMapping("/oauth/{provider}/callback")
    @Operation(summary = "소셜 로그인 콜백")
    public void oauthCallback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription,
            HttpServletResponse response) throws IOException {
        try {
            if (error != null && !error.isBlank()) {
                boolean cancelled = "access_denied".equalsIgnoreCase(error.trim())
                        || (errorDescription != null && errorDescription.toLowerCase().contains("denied"));
                String reason = cancelled ? "cancelled" : "error";
                String message = cancelled
                        ? null
                        : (errorDescription != null && !errorDescription.isBlank()
                                ? errorDescription
                                : "소셜 로그인에 실패했습니다");
                response.sendRedirect(socialOAuthService.buildReturnRedirectFromState(state, reason, message));
                return;
            }
            String redirect = socialOAuthService.handleCallback(provider, code, state);
            response.sendRedirect(redirect);
        } catch (BusinessException ex) {
            response.sendRedirect(socialOAuthService.buildReturnRedirectFromState(state, "error", ex.getMessage()));
        } catch (Exception ex) {
            response.sendRedirect(socialOAuthService.buildReturnRedirectFromState(state, "error", "소셜 로그인에 실패했습니다"));
        }
    }
}
