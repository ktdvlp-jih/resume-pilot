package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntitlementService {

    private final EntitlementLotRepository lotRepository;
    private final BillingLedgerRepository ledgerRepository;
    private final BillingProductRepository productRepository;

    @Transactional
    public EntitlementLot grantFromProduct(UUID userId, BillingProduct product, UUID paymentId, BillingLedgerEntryType entryType) {
        EntitlementLot lot = EntitlementLot.builder()
                .userId(userId)
                .paymentId(paymentId)
                .kind(product.getKind())
                .operation(product.getKind() == BillingProductKind.COUNT ? product.getOperation() : null)
                .remaining(product.getGrantAmount())
                .originalAmount(product.getGrantAmount())
                .source(EntitlementSource.PURCHASE)
                .build();
        lotRepository.save(lot);
        ledgerRepository.save(BillingLedgerEntry.builder()
                .userId(userId)
                .entryType(entryType)
                .kind(product.getKind())
                .operation(lot.getOperation())
                .amount(product.getGrantAmount())
                .lotId(lot.getId())
                .paymentId(paymentId)
                .build());
        return lot;
    }

    @Transactional
    public EntitlementLot adminGrant(UUID userId, BillingProductKind kind, String operation, int amount, String note) {
        if (amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "amount must be > 0");
        }
        if (kind == BillingProductKind.COUNT && (operation == null || operation.isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "operation required for COUNT");
        }
        if (kind == BillingProductKind.TOKEN) {
            operation = null;
        }
        EntitlementLot lot = EntitlementLot.builder()
                .userId(userId)
                .kind(kind)
                .operation(operation)
                .remaining(amount)
                .originalAmount(amount)
                .source(EntitlementSource.ADMIN)
                .build();
        lotRepository.save(lot);
        ledgerRepository.save(BillingLedgerEntry.builder()
                .userId(userId)
                .entryType(BillingLedgerEntryType.ADMIN_GRANT)
                .kind(kind)
                .operation(operation)
                .amount(amount)
                .lotId(lot.getId())
                .note(note)
                .build());
        return lot;
    }

    @Transactional
    public EntitlementLot grantFree(
            UUID userId,
            BillingProductKind kind,
            String operation,
            int amount,
            Instant expiresAt
    ) {
        if (amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "amount must be > 0");
        }
        if (kind == BillingProductKind.COUNT && (operation == null || operation.isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "operation required for COUNT");
        }
        if (kind == BillingProductKind.TOKEN) {
            operation = null;
        }
        EntitlementLot lot = EntitlementLot.builder()
                .userId(userId)
                .kind(kind)
                .operation(operation)
                .remaining(amount)
                .originalAmount(amount)
                .source(EntitlementSource.FREE_MONTHLY)
                .expiresAt(expiresAt)
                .build();
        lotRepository.save(lot);
        ledgerRepository.save(BillingLedgerEntry.builder()
                .userId(userId)
                .entryType(BillingLedgerEntryType.FREE_GRANT)
                .kind(kind)
                .operation(operation)
                .amount(amount)
                .lotId(lot.getId())
                .note("FREE_MONTHLY")
                .build());
        return lot;
    }

    @Transactional
    public int reclaimRemainingForPayment(UUID paymentId, UUID userId) {
        var lots = lotRepository.findByPaymentIdAndRemainingGreaterThan(paymentId, 0);
        int total = 0;
        for (EntitlementLot lot : lots) {
            int rem = lot.getRemaining();
            if (rem <= 0) {
                continue;
            }
            lot.setRemaining(0);
            lotRepository.save(lot);
            total += rem;
            ledgerRepository.save(BillingLedgerEntry.builder()
                    .userId(userId)
                    .entryType(BillingLedgerEntryType.CANCEL_RECLAIM)
                    .kind(lot.getKind())
                    .operation(lot.getOperation())
                    .amount(rem)
                    .lotId(lot.getId())
                    .paymentId(paymentId)
                    .build());
        }
        return total;
    }

    @Transactional
    public void markManualFixNeeded(UUID userId, UUID paymentId) {
        ledgerRepository.save(BillingLedgerEntry.builder()
                .userId(userId)
                .entryType(BillingLedgerEntryType.CANCEL_RECLAIM)
                .amount(0)
                .paymentId(paymentId)
                .needsManualFix(true)
                .note("cancel reclaim failed")
                .build());
    }

    public BillingProduct requireProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Product not found"));
    }
}
