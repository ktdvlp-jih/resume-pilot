package com.resumepilot.presentation.controller;

import com.resumepilot.application.ops.OpsService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.billing.WalletResponse;
import com.resumepilot.presentation.dto.ops.OpsGrantRequest;
import com.resumepilot.presentation.dto.ops.OpsPaymentSummaryResponse;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Hidden
@RestController
@RequestMapping("/api/v1/ops")
@RequiredArgsConstructor
public class OpsController {

    private final OpsService opsService;

    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.ok(opsService.healthSummary());
    }

    @GetMapping("/wallet")
    public ApiResponse<WalletResponse> wallet(@RequestParam String email) {
        return ApiResponse.ok(opsService.walletByEmail(email));
    }

    @PostMapping("/grant")
    public ApiResponse<WalletResponse> grant(@Valid @RequestBody OpsGrantRequest request) {
        return ApiResponse.ok(opsService.grant(request));
    }

    @PostMapping("/free-allowance/{email:.+}")
    public ApiResponse<Map<String, Object>> freeAllowance(@PathVariable String email) {
        return ApiResponse.ok(opsService.grantFreeAllowance(email));
    }

    @GetMapping("/payments/recent")
    public ApiResponse<List<OpsPaymentSummaryResponse>> recentPayments(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.ok(opsService.recentPayments(limit));
    }
}
