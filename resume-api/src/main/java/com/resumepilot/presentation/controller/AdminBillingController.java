package com.resumepilot.presentation.controller;

import com.resumepilot.application.billing.BillingLedgerService;
import com.resumepilot.application.billing.BillingWalletService;
import com.resumepilot.application.billing.CouponService;
import com.resumepilot.application.billing.IntegrationSettingsService;
import com.resumepilot.application.billing.PaymentService;
import com.resumepilot.application.integration.GitHubOAuthService;
import com.resumepilot.application.integration.NotionOAuthService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.billing.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Billing")
public class AdminBillingController {

    private static final String NOTION_REDIRECT_TEMPLATE =
            "http://localhost:8080/api/v1/experiences/import/notion/oauth/callback";
    private static final String GITHUB_REDIRECT_TEMPLATE =
            "http://localhost:8080/api/v1/experiences/import/github/oauth/callback";
    private static final String GOOGLE_LOGIN_REDIRECT_TEMPLATE =
            "http://localhost:8080/api/v1/auth/oauth/google/callback";
    private static final String KAKAO_LOGIN_REDIRECT_TEMPLATE =
            "http://localhost:8080/api/v1/auth/oauth/kakao/callback";

    private final IntegrationSettingsService integrationSettings;
    private final BillingWalletService walletService;
    private final BillingLedgerService ledgerService;
    private final CouponService couponService;
    private final PaymentService paymentService;
    private final NotionOAuthService notionOAuthService;
    private final GitHubOAuthService gitHubOAuthService;

    @Value("${app.public-api-url:http://localhost:8080}")
    private String publicApiUrl;

    @GetMapping("/integration-settings")
    @Operation(summary = "연동 설정 목록")
    public ApiResponse<List<IntegrationSettingItemResponse>> listIntegrationSettings() {
        return ApiResponse.ok(integrationSettings.listForAdmin());
    }

    @GetMapping("/integration-settings/oauth-hints")
    @Operation(summary = "OAuth Redirect URI 템플릿·현재 API 기준 URL")
    public ApiResponse<IntegrationOAuthHintsResponse> integrationOAuthHints() {
        String apiBase = trimTrailingSlash(publicApiUrl);
        return ApiResponse.ok(new IntegrationOAuthHintsResponse(
                apiBase,
                notionOAuthService.resolveRedirectUri(),
                gitHubOAuthService.resolveRedirectUri(),
                apiBase + "/api/v1/auth/oauth/google/callback",
                apiBase + "/api/v1/auth/oauth/kakao/callback",
                NOTION_REDIRECT_TEMPLATE,
                GITHUB_REDIRECT_TEMPLATE,
                GOOGLE_LOGIN_REDIRECT_TEMPLATE,
                KAKAO_LOGIN_REDIRECT_TEMPLATE));
    }

    @PatchMapping("/integration-settings")
    @Operation(summary = "연동 설정 저장")
    public ApiResponse<List<IntegrationSettingItemResponse>> updateIntegrationSettings(
            @Valid @RequestBody IntegrationSettingsUpdateRequest request) {
        return ApiResponse.ok(integrationSettings.update(request));
    }

    @GetMapping("/integration-settings/{key}/reveal")
    @Operation(summary = "연동 시크릿 키 평문 조회 (관리자)")
    public ApiResponse<IntegrationSettingRevealResponse> revealIntegrationSetting(
            @PathVariable String key) {
        return ApiResponse.ok(integrationSettings.revealSecret(key));
    }

    @GetMapping("/billing/products")
    public ApiResponse<List<BillingProductResponse>> listProducts() {
        return ApiResponse.ok(walletService.listAllProducts());
    }

    @PutMapping("/billing/products")
    public ApiResponse<BillingProductResponse> upsertProduct(
            @Valid @RequestBody BillingProductUpsertRequest request) {
        return ApiResponse.ok(walletService.upsertProduct(request));
    }

    @GetMapping("/billing/operation-costs")
    public ApiResponse<List<OperationCostResponse>> listCosts() {
        return ApiResponse.ok(walletService.listCosts());
    }

    @PatchMapping("/billing/operation-costs/{operation}")
    public ApiResponse<OperationCostResponse> updateCost(
            @PathVariable String operation,
            @Valid @RequestBody OperationCostUpdateRequest request) {
        return ApiResponse.ok(walletService.updateCost(operation, request.tokenCost()));
    }

    @GetMapping("/payments")
    public ApiResponse<List<PaymentAdminResponse>> listPayments() {
        return ApiResponse.ok(paymentService.listPayments());
    }

    @PostMapping("/payments/{id}/cancel")
    public ApiResponse<PaymentAdminResponse> cancel(
            @PathVariable UUID id,
            @RequestBody(required = false) CancelPaymentRequest request) {
        String reason = request == null ? null : request.reason();
        return ApiResponse.ok(paymentService.cancel(id, reason));
    }

    @GetMapping("/users/{userId}/wallet")
    public ApiResponse<WalletResponse> userWallet(@PathVariable UUID userId) {
        return ApiResponse.ok(walletService.wallet(userId));
    }

    @PostMapping("/users/{userId}/entitlements")
    public ApiResponse<WalletResponse> grant(
            @PathVariable UUID userId,
            @Valid @RequestBody AdminGrantRequest request) {
        return ApiResponse.ok(walletService.adminGrant(userId, request, SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/users/{userId}/ledger")
    @Operation(summary = "사용자 충전·지급 내역")
    public ApiResponse<List<LedgerEntryResponse>> userLedger(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "30") int limit) {
        return ApiResponse.ok(ledgerService.listAdminCredits(userId, limit));
    }

    @GetMapping("/billing/coupons")
    @Operation(summary = "쿠폰 목록")
    public ApiResponse<List<CouponResponse>> listCoupons() {
        return ApiResponse.ok(couponService.listCoupons());
    }

    @PostMapping("/billing/coupons")
    @Operation(summary = "쿠폰 발급")
    public ApiResponse<CouponResponse> createCoupon(@Valid @RequestBody CreateCouponRequest request) {
        return ApiResponse.ok(couponService.createCoupon(request, SecurityUtils.getCurrentUserId()));
    }

    @PatchMapping("/billing/coupons/{id}/enabled")
    @Operation(summary = "쿠폰 활성/비활성")
    public ApiResponse<CouponResponse> setCouponEnabled(
            @PathVariable UUID id,
            @RequestParam boolean enabled) {
        return ApiResponse.ok(couponService.setCouponEnabled(id, enabled));
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
