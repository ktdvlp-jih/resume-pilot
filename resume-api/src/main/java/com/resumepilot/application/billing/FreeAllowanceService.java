package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FreeAllowanceService {

    public static final int FREE_GENERATE = 2;
    public static final int FREE_JOB_ANALYSIS = 1;
    public static final int FREE_TOKENS = 50;

    private final FreeAllowanceGrantRepository grantRepository;
    private final EntitlementLotRepository lotRepository;
    private final EntitlementService entitlementService;
    private final UserRepository userRepository;

    public static String currentPeriodKey() {
        return YearMonth.now(ZoneOffset.UTC).toString();
    }

    public static Instant periodEndExclusive(String periodKey) {
        YearMonth ym = YearMonth.parse(periodKey);
        return ym.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
    }

    /** 가입·스케줄·Ops 강제 지급. 이미 해당 월이면 false. */
    @Transactional
    public boolean grantForCurrentPeriod(UUID userId) {
        String period = currentPeriodKey();
        if (grantRepository.existsByUserIdAndPeriodKey(userId, period)) {
            return false;
        }
        expireActiveFreeLots(userId);
        Instant expiresAt = periodEndExclusive(period);
        entitlementService.grantFree(userId, BillingProductKind.COUNT, "GENERATE", FREE_GENERATE, expiresAt);
        entitlementService.grantFree(userId, BillingProductKind.COUNT, "JOB_ANALYSIS", FREE_JOB_ANALYSIS, expiresAt);
        entitlementService.grantFree(userId, BillingProductKind.TOKEN, null, FREE_TOKENS, expiresAt);
        grantRepository.save(FreeAllowanceGrant.builder()
                .userId(userId)
                .periodKey(period)
                .build());
        return true;
    }

    @Transactional
    public int grantAllEligibleUsers() {
        lotRepository.expireFreeLots(Instant.now());
        List<User> users = userRepository.findByRoleAndEnabledTrue(UserRole.USER);
        int n = 0;
        for (User user : users) {
            try {
                if (grantForCurrentPeriod(user.getId())) {
                    n++;
                }
            } catch (Exception e) {
                log.warn("Free allowance failed for {}: {}", user.getId(), e.getMessage());
            }
        }
        return n;
    }

    private void expireActiveFreeLots(UUID userId) {
        for (EntitlementLot lot : lotRepository.findActiveFreeLotsForUpdate(userId)) {
            lot.setRemaining(0);
            lotRepository.save(lot);
        }
    }
}
