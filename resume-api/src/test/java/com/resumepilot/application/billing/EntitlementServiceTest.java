package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntitlementServiceTest {

    @Mock EntitlementLotRepository lotRepository;
    @Mock BillingLedgerRepository ledgerRepository;
    @Mock BillingProductRepository productRepository;
    @InjectMocks EntitlementService entitlementService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void grantFromProductCreatesTokenLot() {
        UUID paymentId = UUID.randomUUID();
        BillingProduct product = BillingProduct.builder()
                .id(UUID.randomUUID())
                .name("토큰 100")
                .kind(BillingProductKind.TOKEN)
                .grantAmount(100)
                .priceKrw(1000)
                .build();
        when(lotRepository.save(any())).thenAnswer(inv -> {
            EntitlementLot lot = inv.getArgument(0);
            lot.setId(UUID.randomUUID());
            return lot;
        });
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EntitlementLot lot = entitlementService.grantFromProduct(
                userId, product, paymentId, BillingLedgerEntryType.GRANT);

        assertThat(lot.getKind()).isEqualTo(BillingProductKind.TOKEN);
        assertThat(lot.getOperation()).isNull();
        assertThat(lot.getRemaining()).isEqualTo(100);
        assertThat(lot.getPaymentId()).isEqualTo(paymentId);
        verify(ledgerRepository).save(argThat(e ->
                e.getEntryType() == BillingLedgerEntryType.GRANT && e.getAmount() == 100));
    }

    @Test
    void grantFromProductCreatesCountLotWithOperation() {
        BillingProduct product = BillingProduct.builder()
                .id(UUID.randomUUID())
                .name("생성 10회")
                .kind(BillingProductKind.COUNT)
                .operation("GENERATE")
                .grantAmount(10)
                .priceKrw(3000)
                .build();
        when(lotRepository.save(any())).thenAnswer(inv -> {
            EntitlementLot lot = inv.getArgument(0);
            lot.setId(UUID.randomUUID());
            return lot;
        });
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EntitlementLot lot = entitlementService.grantFromProduct(
                userId, product, null, BillingLedgerEntryType.GRANT);

        assertThat(lot.getOperation()).isEqualTo("GENERATE");
        assertThat(lot.getRemaining()).isEqualTo(10);
    }

    @Test
    void adminGrantRejectsNonPositiveAmount() {
        assertThatThrownBy(() -> entitlementService.adminGrant(
                userId, BillingProductKind.TOKEN, null, 0, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void adminGrantRequiresOperationForCount() {
        assertThatThrownBy(() -> entitlementService.adminGrant(
                userId, BillingProductKind.COUNT, null, 5, null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> entitlementService.adminGrant(
                userId, BillingProductKind.COUNT, "  ", 5, null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void adminGrantClearsOperationForToken() {
        when(lotRepository.save(any())).thenAnswer(inv -> {
            EntitlementLot lot = inv.getArgument(0);
            lot.setId(UUID.randomUUID());
            return lot;
        });
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EntitlementLot lot = entitlementService.adminGrant(
                userId, BillingProductKind.TOKEN, "GENERATE", 30, "bonus");

        assertThat(lot.getOperation()).isNull();
        assertThat(lot.getRemaining()).isEqualTo(30);
        verify(ledgerRepository).save(argThat(e ->
                e.getEntryType() == BillingLedgerEntryType.ADMIN_GRANT
                        && "bonus".equals(e.getNote())));
    }

    @Test
    void reclaimRemainingZeroesLots() {
        UUID paymentId = UUID.randomUUID();
        EntitlementLot lot = EntitlementLot.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .paymentId(paymentId)
                .kind(BillingProductKind.TOKEN)
                .remaining(40)
                .originalAmount(100)
                .build();
        when(lotRepository.findByPaymentIdAndRemainingGreaterThan(paymentId, 0))
                .thenReturn(List.of(lot));
        when(lotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int reclaimed = entitlementService.reclaimRemainingForPayment(paymentId, userId);

        assertThat(reclaimed).isEqualTo(40);
        assertThat(lot.getRemaining()).isZero();
        verify(ledgerRepository).save(argThat(e ->
                e.getEntryType() == BillingLedgerEntryType.CANCEL_RECLAIM && e.getAmount() == 40));
    }

    @Test
    void markManualFixNeededWritesFlag() {
        UUID paymentId = UUID.randomUUID();
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        entitlementService.markManualFixNeeded(userId, paymentId);

        ArgumentCaptor<BillingLedgerEntry> captor = ArgumentCaptor.forClass(BillingLedgerEntry.class);
        verify(ledgerRepository).save(captor.capture());
        assertThat(captor.getValue().isNeedsManualFix()).isTrue();
        assertThat(captor.getValue().getPaymentId()).isEqualTo(paymentId);
    }

    @Test
    void requireProductThrowsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(productRepository.findById(id)).thenReturn(java.util.Optional.empty());
        assertThatThrownBy(() -> entitlementService.requireProduct(id))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.NOT_FOUND);
    }
}
