package com.resumepilot.application.guest;

import com.resumepilot.domain.guest.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuestTrialService {

    public static final int MAX_JOB_ANALYSIS = 5;
    public static final int MAX_GENERATE = 3;
    public static final int MAX_TOTAL = 10;
    private static final int MAX_GUESTS_PER_IP_PER_DAY = 5;
    private static final int TRIAL_DAYS = 7;

    private final GuestTrialRepository trialRepository;
    private final GuestTrialUseRepository useRepository;

    @Transactional
    public GuestTrial getOrCreate(String guestId, String ip) {
        if (guestId != null && !guestId.isBlank()) {
            Optional<GuestTrial> existing = trialRepository.findByGuestId(guestId);
            if (existing.isPresent()) {
                GuestTrial trial = existing.get();
                if (trial.getExpiresAt().isAfter(Instant.now())) {
                    return trial;
                }
            }
        }
        return createNew(ip);
    }

    @Transactional
    public GuestTrial createNew(String ip) {
        if (ip != null && !ip.isBlank()) {
            long todayCount = trialRepository.countByIpSince(ip, Instant.now().minus(1, ChronoUnit.DAYS));
            if (todayCount >= MAX_GUESTS_PER_IP_PER_DAY) {
                throw new BusinessException(ErrorCode.RATE_LIMITED, "오늘 체험 횟수를 초과했습니다. 내일 다시 시도하거나 가입해 주세요.");
            }
        }
        GuestTrial trial = GuestTrial.builder()
                .guestId(UUID.randomUUID().toString())
                .ip(ip)
                .expiresAt(Instant.now().plus(TRIAL_DAYS, ChronoUnit.DAYS))
                .converted(false)
                .build();
        return trialRepository.save(trial);
    }

    @Transactional
    public void assertWithinLimit(String guestId, String operation) {
        Map<String, Long> usage = getUsageMap(guestId);
        long total = usage.values().stream().mapToLong(Long::longValue).sum();

        if (total >= MAX_TOTAL) {
            throw new BusinessException(ErrorCode.GUEST_TRIAL_LIMIT_EXCEEDED);
        }
        long opCount = usage.getOrDefault(operation, 0L);
        int opMax = operationLimit(operation);
        if (opMax > 0 && opCount >= opMax) {
            throw new BusinessException(ErrorCode.GUEST_TRIAL_LIMIT_EXCEEDED);
        }
    }

    @Transactional
    public void recordUsage(String guestId, String operation) {
        useRepository.save(GuestTrialUse.builder()
                .guestId(guestId)
                .operation(operation)
                .build());
    }

    public Map<String, Object> getStatus(String guestId) {
        Map<String, Long> usage = getUsageMap(guestId);
        long total = usage.values().stream().mapToLong(Long::longValue).sum();
        return Map.of(
                "jobAnalysis", Map.of("used", usage.getOrDefault("JOB_ANALYSIS", 0L), "max", MAX_JOB_ANALYSIS),
                "generate", Map.of("used", usage.getOrDefault("GENERATE", 0L), "max", MAX_GENERATE),
                "total", Map.of("used", total, "max", MAX_TOTAL)
        );
    }

    public Map<String, Object> emptyStatus() {
        return Map.of(
                "jobAnalysis", Map.of("used", 0L, "max", MAX_JOB_ANALYSIS),
                "generate", Map.of("used", 0L, "max", MAX_GENERATE),
                "total", Map.of("used", 0L, "max", MAX_TOTAL)
        );
    }

    @Transactional
    public void convertToUser(String guestId, UUID userId) {
        GuestTrial trial = trialRepository.findByGuestId(guestId)
                .orElse(null);
        if (trial == null || trial.isConverted()) return;
        trial.setConverted(true);
        trial.setUserId(userId);
        trialRepository.save(trial);
    }

    private Map<String, Long> getUsageMap(String guestId) {
        Map<String, Long> map = new HashMap<>();
        for (Object[] row : useRepository.countByGuestIdGroupedByOperation(guestId)) {
            map.put((String) row[0], (Long) row[1]);
        }
        return map;
    }

    private static int operationLimit(String operation) {
        return switch (operation) {
            case "JOB_ANALYSIS" -> MAX_JOB_ANALYSIS;
            case "GENERATE" -> MAX_GENERATE;
            default -> 0;
        };
    }
}
