package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.BillingProductKind;
import com.resumepilot.domain.llm.LlmOperation;

import java.util.List;
import java.util.UUID;

/** AI 호출 직전 차감 결과. 실패 시 refund로 되돌린다. */
public record ConsumptionHold(
        UUID userId,
        LlmOperation operation,
        BillingProductKind kind,
        int amount,
        List<LotDeduction> deductions
) {
    public record LotDeduction(UUID lotId, int amount) {}
}
