package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.billing.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingWalletServiceTest {

    @Mock EntitlementLotRepository lotRepository;
    @Mock BillingOperationCostRepository costRepository;
    @Mock BillingProductRepository productRepository;
    @Mock EntitlementService entitlementService;
    @InjectMocks BillingWalletService walletService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void walletAggregatesTokensCountsAndCosts() {
        when(lotRepository.sumTokenRemaining(eq(userId), any(Instant.class))).thenReturn(90L);
        when(lotRepository.sumCountRemainingByOperation(eq(userId), any(Instant.class)))
                .thenReturn(List.of(new Object[]{"GENERATE", 2L}, new Object[]{"AI_REVIEW", 1L}));
        when(costRepository.findAllByOrderByOperationAsc()).thenReturn(List.of(
                BillingOperationCost.builder().operation("GENERATE").tokenCost(50).build()
        ));

        WalletResponse wallet = walletService.wallet(userId);

        assertThat(wallet.tokenBalance()).isEqualTo(90);
        assertThat(wallet.countBalances()).containsEntry("GENERATE", 2L).containsEntry("AI_REVIEW", 1L);
        assertThat(wallet.operationCosts()).hasSize(1);
        assertThat(wallet.operationCosts().getFirst().tokenCost()).isEqualTo(50);
    }

    @Test
    void listEnabledProductsOnly() {
        when(productRepository.findByEnabledTrueOrderBySortOrderAsc()).thenReturn(List.of(
                BillingProduct.builder()
                        .id(UUID.randomUUID()).name("토큰 100").kind(BillingProductKind.TOKEN)
                        .grantAmount(100).priceKrw(1000).enabled(true).sortOrder(1).build()
        ));

        List<BillingProductResponse> products = walletService.listEnabledProducts();
        assertThat(products).hasSize(1);
        assertThat(products.getFirst().name()).isEqualTo("토큰 100");
    }

    @Test
    void upsertProductValidatesCountRequiresOperation() {
        assertThatThrownBy(() -> walletService.upsertProduct(new BillingProductUpsertRequest(
                null, "횟수", "COUNT", null, 10, 1000, true, 1
        )))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void upsertProductCreatesTokenPack() {
        when(productRepository.save(any())).thenAnswer(inv -> {
            BillingProduct p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        BillingProductResponse res = walletService.upsertProduct(new BillingProductUpsertRequest(
                null, "토큰 50", "TOKEN", null, 50, 500, true, 5
        ));

        assertThat(res.kind()).isEqualTo("TOKEN");
        assertThat(res.grantAmount()).isEqualTo(50);
        assertThat(res.operation()).isNull();
    }

    @Test
    void upsertProductUpdatesExisting() {
        UUID id = UUID.randomUUID();
        BillingProduct existing = BillingProduct.builder()
                .id(id).name("old").kind(BillingProductKind.TOKEN)
                .grantAmount(10).priceKrw(100).enabled(true).build();
        when(productRepository.findById(id)).thenReturn(Optional.of(existing));
        when(productRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        BillingProductResponse res = walletService.upsertProduct(new BillingProductUpsertRequest(
                id, "new", "COUNT", "GENERATE", 20, 2000, false, 2
        ));

        assertThat(res.name()).isEqualTo("new");
        assertThat(res.kind()).isEqualTo("COUNT");
        assertThat(res.operation()).isEqualTo("GENERATE");
        assertThat(res.enabled()).isFalse();
    }

    @Test
    void updateCostRejectsNegative() {
        assertThatThrownBy(() -> walletService.updateCost("GENERATE", -1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void updateCostPersists() {
        BillingOperationCost cost = BillingOperationCost.builder()
                .operation("GENERATE").tokenCost(50).build();
        when(costRepository.findById("GENERATE")).thenReturn(Optional.of(cost));
        when(costRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OperationCostResponse res = walletService.updateCost("GENERATE", 40);
        assertThat(res.tokenCost()).isEqualTo(40);
    }

    @Test
    void adminGrantDelegatesAndReturnsWallet() {
        when(entitlementService.adminGrant(eq(userId), eq(BillingProductKind.TOKEN), isNull(), eq(100), eq("note"), isNull()))
                .thenReturn(EntitlementLot.builder().build());
        when(lotRepository.sumTokenRemaining(eq(userId), any(Instant.class))).thenReturn(100L);
        when(lotRepository.sumCountRemainingByOperation(eq(userId), any(Instant.class))).thenReturn(List.of());
        when(costRepository.findAllByOrderByOperationAsc()).thenReturn(List.of());

        WalletResponse wallet = walletService.adminGrant(userId,
                new AdminGrantRequest("TOKEN", null, 100, "note"));

        assertThat(wallet.tokenBalance()).isEqualTo(100);
        verify(entitlementService).adminGrant(userId, BillingProductKind.TOKEN, null, 100, "note", null);
    }
}
