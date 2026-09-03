package com.resumepilot.application.help;

import com.resumepilot.domain.admin.AiUsageLog;
import com.resumepilot.domain.admin.AiUsageLogRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.presentation.dto.help.HelpChatRequest;
import com.resumepilot.presentation.dto.help.HelpChatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class HelpChatService {

    private static final int MAX_HISTORY = 6;

    private final HelpKnowledgeService knowledgeService;
    private final HelpChatRateLimiter rateLimiter;
    private final AiGatewayClient aiGatewayClient;
    private final AiUsageLogRepository usageLogRepository;
    private final PlatformTransactionManager transactionManager;

    public HelpChatResponse chat(HelpChatRequest request, String clientIp) {
        rateLimiter.checkOrThrow(clientIp);

        String message = request.message() == null ? "" : request.message().trim();
        if (message.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "질문을 입력해 주세요.");
        }

        List<Map<String, String>> history = normalizeHistory(request.history());
        Map<String, Object> payload = new HashMap<>();
        payload.put("user_message", message);
        payload.put("knowledge", knowledgeService.getKnowledge());
        payload.put("chat_history", history);
        payload.put("page_context", buildPageContext(request.pagePath(), request.pageLabel()));

        long start = System.currentTimeMillis();
        try {
            Map<String, Object> aiResult = aiGatewayClient.helpChat(payload);
            String reply = str(aiResult.get("reply")).trim();
            if (reply.isBlank()) {
                logUsage(start, false, str(aiResult.get("model")), "empty reply", clientIp);
                throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
            }
            List<String> citations = toStringList(aiResult.get("citations"));
            logUsage(start, true, str(aiResult.get("model")), null, clientIp);
            return new HelpChatResponse(reply, citations);
        } catch (BusinessException e) {
            if (e.getErrorCode() != ErrorCode.RATE_LIMITED) {
                logUsage(start, false, null, e.getMessage(), clientIp);
            }
            throw e;
        } catch (Exception e) {
            log.warn("HELP_CHAT failed: {}", e.getMessage());
            logUsage(start, false, null, e.getMessage(), clientIp);
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "도움 안내를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    private static String buildPageContext(String pagePath, String pageLabel) {
        String path = pagePath == null ? "" : pagePath.trim();
        String label = pageLabel == null ? "" : pageLabel.trim();
        if (path.length() > 200) path = path.substring(0, 200);
        if (label.length() > 100) label = label.substring(0, 100);
        if (path.isBlank() && label.isBlank()) {
            return "(현재 화면 정보 없음)";
        }
        if (label.isBlank()) {
            return "현재 사용자가 보고 있는 화면 경로: " + path;
        }
        if (path.isBlank()) {
            return "현재 사용자가 보고 있는 화면: " + label;
        }
        return "현재 사용자가 보고 있는 화면: " + label + " (" + path + ")";
    }

    private List<Map<String, String>> normalizeHistory(List<HelpChatRequest.HistoryItem> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<Map<String, String>> out = new ArrayList<>();
        int start = Math.max(0, raw.size() - MAX_HISTORY);
        for (int i = start; i < raw.size(); i++) {
            HelpChatRequest.HistoryItem item = raw.get(i);
            if (item == null || item.role() == null || item.content() == null) continue;
            String role = item.role().trim().toLowerCase(Locale.ROOT);
            if (!role.equals("user") && !role.equals("assistant")) continue;
            String content = item.content().trim();
            if (content.isBlank()) continue;
            if (content.length() > 2000) content = content.substring(0, 2000);
            out.add(Map.of("role", role, "content", content));
        }
        return out;
    }

    private void logUsage(long startMs, boolean success, String model, String error, String clientIp) {
        String err = error;
        if (err != null && err.length() > 500) err = err.substring(0, 500);
        final String errFinal = err;
        String ipMeta = clientIp == null ? "" : clientIp;
        if (ipMeta.length() > 64) ipMeta = ipMeta.substring(0, 64);
        final String ipFinal = ipMeta;
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(status -> usageLogRepository.save(AiUsageLog.builder()
                .userId(null)
                .service("resume-ai")
                .operation("help_chat")
                .model(model)
                .durationMs((int) (System.currentTimeMillis() - startMs))
                .status(success ? "SUCCESS" : "FAILED")
                .errorMessage(success ? null : errFinal)
                .metadata(Map.of("client_ip", ipFinal))
                .build()));
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static List<String> toStringList(Object o) {
        if (!(o instanceof List<?> list)) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (Object v : list) {
            if (v == null) continue;
            String s = String.valueOf(v).trim();
            if (!s.isBlank()) out.add(s);
        }
        return out;
    }
}
