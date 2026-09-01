package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.llm.LlmOperation;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingGuardTest {

    @Mock EntitlementLotRepository lotRepository;
    @Mock BillingOperationCostRepository costRepository;
    @Mock BillingLedgerRepository ledgerRepository;
    @InjectMocks BillingGuard billingGuard;

    private final UUID userId = UUID.randomUUID();

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    private void loginAs(String role) {
        UserPrincipal principal = new UserPrincipal(userId, "u@test.com", "pw", role);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @Test
    void embeddingIsFree() {
        loginAs("USER");
        assertThat(billingGuard.consume(userId, LlmOperation.EMBEDDING)).isNull();
        verifyNoInteractions(lotRepository, costRepository, ledgerRepository);
    }

    @Test
    void adminRolesSkipBilling() {
        for (String role : List.of("ADMIN", "JOB_ADMIN", "USER_ADMIN")) {
            loginAs(role);
            assertThat(billingGuard.consume(userId, LlmOperation.GENERATE)).isNull();
        }
        verifyNoInteractions(lotRepository);
    }

    @Test
    void prefersCountLotOverTokens() {
        loginAs("USER");
        EntitlementLot countLot = EntitlementLot.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .kind(BillingProductKind.COUNT)
                .operation("AI_DETECTION")
                .remaining(2)
                .originalAmount(2)
                .build();
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.COUNT), eq("AI_DETECTION"), any(Instant.class)))
                .thenReturn(List.of(countLot));
        when(lotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConsumptionHold hold = billingGuard.consume(userId, LlmOperation.AI_DETECTION);

        assertThat(hold).isNotNull();
        assertThat(hold.kind()).isEqualTo(BillingProductKind.COUNT);
        assertThat(hold.amount()).isEqualTo(1);
        assertThat(countLot.getRemaining()).isEqualTo(1);
        verify(costRepository, never()).findById(anyString());
        verify(ledgerRepository).save(argThat(e -> e.getEntryType() == BillingLedgerEntryType.CONSUME));
    }

    @Test
    void deductsTokensAcrossFifoLots() {
        loginAs("USER");
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.COUNT), eq("AI_DETECTION"), any(Instant.class)))
                .thenReturn(List.of());
        when(costRepository.findById("AI_DETECTION"))
                .thenReturn(Optional.of(BillingOperationCost.builder().operation("AI_DETECTION").tokenCost(10).build()));

        EntitlementLot lot1 = EntitlementLot.builder()
                .id(UUID.randomUUID()).userId(userId).kind(BillingProductKind.TOKEN)
                .remaining(4).originalAmount(4).build();
        EntitlementLot lot2 = EntitlementLot.builder()
                .id(UUID.randomUUID()).userId(userId).kind(BillingProductKind.TOKEN)
                .remaining(20).originalAmount(20).build();
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.TOKEN), isNull(), any(Instant.class)))
                .thenReturn(List.of(lot1, lot2));
        when(lotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConsumptionHold hold = billingGuard.consume(userId, LlmOperation.AI_DETECTION);

        assertThat(hold.kind()).isEqualTo(BillingProductKind.TOKEN);
        assertThat(hold.amount()).isEqualTo(10);
        assertThat(hold.deductions()).hasSize(2);
        assertThat(lot1.getRemaining()).isZero();
        assertThat(lot2.getRemaining()).isEqualTo(14);
    }

    @Test
    void throwsInsufficientWhenNotEnoughTokens() {
        loginAs("USER");
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.COUNT), eq("GENERATE"), any(Instant.class)))
                .thenReturn(List.of());
        when(costRepository.findById("GENERATE"))
                .thenReturn(Optional.of(BillingOperationCost.builder().operation("GENERATE").tokenCost(50).build()));
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.TOKEN), isNull(), any(Instant.class)))
                .thenReturn(List.of(EntitlementLot.builder()
                        .id(UUID.randomUUID()).userId(userId).kind(BillingProductKind.TOKEN)
                        .remaining(10).originalAmount(10).build()));

        assertThatThrownBy(() -> billingGuard.consume(userId, LlmOperation.GENERATE))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_BALANCE);
    }

    @Test
    void throwsWhenOperationCostMissing() {
        loginAs("USER");
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.COUNT), eq("GENERATE"), any(Instant.class)))
                .thenReturn(List.of());
        when(costRepository.findById("GENERATE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingGuard.consume(userId, LlmOperation.GENERATE))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void zeroTokenCostIsFree() {
        loginAs("USER");
        when(lotRepository.findAvailableForUpdate(eq(userId), eq(BillingProductKind.COUNT), eq("KEYWORD_COMPARE"), any(Instant.class)))
                .thenReturn(List.of());
        when(costRepository.findById("KEYWORD_COMPARE"))
                .thenReturn(Optional.of(BillingOperationCost.builder()
                        .operation("KEYWORD_COMPARE").tokenCost(0).build()));

        assertThat(billingGuard.consume(userId, LlmOperation.KEYWORD_COMPARE)).isNull();
    }

    @Test
    void refundRestoresLotsAndWritesLedger() {
        loginAs("USER");
        UUID lotId = UUID.randomUUID();
        EntitlementLot lot = EntitlementLot.builder()
                .id(lotId).userId(userId).kind(BillingProductKind.TOKEN)
                .remaining(40).originalAmount(50).build();
        when(lotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(lotRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(ledgerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConsumptionHold hold = new ConsumptionHold(
                userId,
                LlmOperation.GENERATE,
                BillingProductKind.TOKEN,
                10,
                List.of(new ConsumptionHold.LotDeduction(lotId, 10))
        );
        billingGuard.refund(hold);

        assertThat(lot.getRemaining()).isEqualTo(50);
        verify(ledgerRepository).save(argThat(e ->
                e.getEntryType() == BillingLedgerEntryType.REFUND && e.getAmount() == 10));
    }

    @Test
    void refundNoopForNullHold() {
        billingGuard.refund(null);
        verifyNoInteractions(lotRepository, ledgerRepository);
    }
}
