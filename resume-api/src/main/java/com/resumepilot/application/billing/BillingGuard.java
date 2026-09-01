package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.llm.LlmOperation;
import com.resumepilot.domain.user.UserRole;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingGuard {

    private final EntitlementLotRepository lotRepository;
    private final BillingOperationCostRepository costRepository;
    private final BillingLedgerRepository ledgerRepository;

    /** 관리자 역할이면 차감하지 않고 null 반환. */
    @Transactional
    public ConsumptionHold consume(UUID userId, LlmOperation operation) {
        if (operation == LlmOperation.EMBEDDING) {
            return null;
        }
        if (isPrivilegedAdmin()) {
            return null;
        }
        String op = operation.name();
        Instant now = Instant.now();

        // 1) 횟수 로트 우선
        List<EntitlementLot> countLots = lotRepository.findAvailableForUpdate(
                userId, BillingProductKind.COUNT, op, now);
        int countAvailable = countLots.stream().mapToInt(EntitlementLot::getRemaining).sum();
        if (countAvailable >= 1) {
            return deduct(userId, operation, BillingProductKind.COUNT, op, 1, countLots);
        }

        // 2) 토큰
        int tokenCost = costRepository.findById(op)
                .map(BillingOperationCost::getTokenCost)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_INPUT, "No billing cost configured for " + op));
        if (tokenCost <= 0) {
            return null;
        }
        List<EntitlementLot> tokenLots = lotRepository.findAvailableForUpdate(
                userId, BillingProductKind.TOKEN, null, now);
        int tokenAvailable = tokenLots.stream().mapToInt(EntitlementLot::getRemaining).sum();
        if (tokenAvailable < tokenCost) {
            throw new BusinessException(
                    ErrorCode.INSUFFICIENT_BALANCE,
                    "토큰 또는 횟수가 부족합니다. 충전 후 다시 시도해 주세요.");
        }
        return deduct(userId, operation, BillingProductKind.TOKEN, null, tokenCost, tokenLots);
    }

    @Transactional
    public void refund(ConsumptionHold hold) {
        if (hold == null || hold.deductions() == null || hold.deductions().isEmpty()) {
            return;
        }
        for (var d : hold.deductions()) {
            EntitlementLot lot = lotRepository.findById(d.lotId()).orElse(null);
            if (lot == null) {
                continue;
            }
            lot.setRemaining(lot.getRemaining() + d.amount());
            lotRepository.save(lot);
            ledgerRepository.save(BillingLedgerEntry.builder()
                    .userId(hold.userId())
                    .entryType(BillingLedgerEntryType.REFUND)
                    .kind(hold.kind())
                    .operation(hold.kind() == BillingProductKind.COUNT ? hold.operation().name() : null)
                    .amount(d.amount())
                    .lotId(lot.getId())
                    .note("AI failure refund")
                    .build());
        }
    }

    private ConsumptionHold deduct(
            UUID userId,
            LlmOperation operation,
            BillingProductKind kind,
            String countOperation,
            int need,
            List<EntitlementLot> lots
    ) {
        List<ConsumptionHold.LotDeduction> deductions = new ArrayList<>();
        int left = need;
        for (EntitlementLot lot : lots) {
            if (left <= 0) {
                break;
            }
            int take = Math.min(lot.getRemaining(), left);
            lot.setRemaining(lot.getRemaining() - take);
            lotRepository.save(lot);
            deductions.add(new ConsumptionHold.LotDeduction(lot.getId(), take));
            ledgerRepository.save(BillingLedgerEntry.builder()
                    .userId(userId)
                    .entryType(BillingLedgerEntryType.CONSUME)
                    .kind(kind)
                    .operation(countOperation)
                    .amount(take)
                    .lotId(lot.getId())
                    .build());
            left -= take;
        }
        if (left > 0) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_BALANCE);
        }
        return new ConsumptionHold(userId, operation, kind, need, deductions);
    }

    private boolean isPrivilegedAdmin() {
        try {
            String role = SecurityUtils.getCurrentRole();
            return UserRole.ADMIN.name().equals(role)
                    || UserRole.JOB_ADMIN.name().equals(role)
                    || UserRole.USER_ADMIN.name().equals(role);
        } catch (BusinessException e) {
            return false;
        }
    }
}
