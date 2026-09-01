package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FreeAllowanceServiceTest {

    @Mock FreeAllowanceGrantRepository grantRepository;
    @Mock EntitlementLotRepository lotRepository;
    @Mock EntitlementService entitlementService;
    @Mock UserRepository userRepository;
    @InjectMocks FreeAllowanceService freeAllowanceService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void grantForCurrentPeriodCreatesThreeLotsOnce() {
        String period = FreeAllowanceService.currentPeriodKey();
        when(grantRepository.existsByUserIdAndPeriodKey(userId, period)).thenReturn(false);
        when(lotRepository.findActiveFreeLotsForUpdate(userId)).thenReturn(List.of());

        assertThat(freeAllowanceService.grantForCurrentPeriod(userId)).isTrue();

        verify(entitlementService).grantFree(eq(userId), eq(BillingProductKind.COUNT), eq("GENERATE"),
                eq(FreeAllowanceService.FREE_GENERATE), any());
        verify(entitlementService).grantFree(eq(userId), eq(BillingProductKind.COUNT), eq("JOB_ANALYSIS"),
                eq(FreeAllowanceService.FREE_JOB_ANALYSIS), any());
        verify(entitlementService).grantFree(eq(userId), eq(BillingProductKind.TOKEN), isNull(),
                eq(FreeAllowanceService.FREE_TOKENS), any());
        ArgumentCaptor<FreeAllowanceGrant> cap = ArgumentCaptor.forClass(FreeAllowanceGrant.class);
        verify(grantRepository).save(cap.capture());
        assertThat(cap.getValue().getPeriodKey()).isEqualTo(period);
    }

    @Test
    void grantForCurrentPeriodSkipsDuplicateMonth() {
        when(grantRepository.existsByUserIdAndPeriodKey(eq(userId), anyString())).thenReturn(true);
        assertThat(freeAllowanceService.grantForCurrentPeriod(userId)).isFalse();
        verifyNoInteractions(entitlementService);
    }
}
