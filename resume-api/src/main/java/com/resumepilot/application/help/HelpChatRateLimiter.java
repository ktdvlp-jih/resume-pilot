package com.resumepilot.application.help;

import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** 공개 HELP_CHAT IP당 분당 요청 제한 (인메모리). */
@Component
public class HelpChatRateLimiter {

    private static final int MAX_PER_MINUTE = 10;
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> hitsByKey = new ConcurrentHashMap<>();

    public void checkOrThrow(String clientKey) {
        String key = (clientKey == null || clientKey.isBlank()) ? "unknown" : clientKey.trim();
        long now = System.currentTimeMillis();
        Deque<Long> q = hitsByKey.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > WINDOW_MS) {
                q.pollFirst();
            }
            if (q.size() >= MAX_PER_MINUTE) {
                throw new BusinessException(ErrorCode.RATE_LIMITED,
                        "질문이 너무 많아요. 잠시 후 다시 물어봐 주세요.");
            }
            q.addLast(now);
        }
    }
}
