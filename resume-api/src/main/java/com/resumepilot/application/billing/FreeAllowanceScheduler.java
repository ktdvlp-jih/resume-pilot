package com.resumepilot.application.billing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FreeAllowanceScheduler {

    private final FreeAllowanceService freeAllowanceService;

    /** 매일 00:20 UTC — 해당 월 Free 미지급 USER에게 지급 */
    @Scheduled(cron = "0 20 0 * * *")
    public void runDaily() {
        int n = freeAllowanceService.grantAllEligibleUsers();
        if (n > 0) {
            log.info("Free monthly allowance granted to {} users", n);
        }
    }
}
