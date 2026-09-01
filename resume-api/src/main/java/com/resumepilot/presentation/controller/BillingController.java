package com.resumepilot.presentation.controller;

import com.resumepilot.application.billing.BillingWalletService;
import com.resumepilot.application.billing.PaymentService;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.billing.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Billing / Payments")
public class BillingController {

    private final PaymentService paymentService;
    private final BillingWalletService walletService;

    @GetMapping("/api/v1/payments/client-key")
    @Operation(summary = "토스 클라이언트 키 (공개)")
    public ApiResponse<ClientKeyResponse> clientKey() {
        return ApiResponse.ok(paymentService.clientKey());
    }

    @GetMapping("/api/v1/billing/wallet")
    @Operation(summary = "내 토큰·횟수 잔액")
    public ApiResponse<WalletResponse> wallet() {
        return ApiResponse.ok(walletService.wallet(SecurityUtils.getCurrentUserId()));
    }

    @GetMapping("/api/v1/billing/products")
    @Operation(summary = "판매 중인 상품")
    public ApiResponse<List<BillingProductResponse>> products() {
        return ApiResponse.ok(walletService.listEnabledProducts());
    }

    @PostMapping("/api/v1/payments/orders")
    @Operation(summary = "결제 주문 생성")
    public ApiResponse<CreateOrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return ApiResponse.ok(paymentService.createOrder(SecurityUtils.getCurrentUserId(), request));
    }

    @PostMapping("/api/v1/payments/confirm")
    @Operation(summary = "결제 승인 및 상품 지급")
    public ApiResponse<ConfirmPaymentResponse> confirm(@Valid @RequestBody ConfirmPaymentRequest request) {
        return ApiResponse.ok(paymentService.confirm(SecurityUtils.getCurrentUserId(), request));
    }
}
