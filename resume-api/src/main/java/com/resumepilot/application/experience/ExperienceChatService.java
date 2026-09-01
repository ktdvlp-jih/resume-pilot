package com.resumepilot.application.experience;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumepilot.application.billing.BillingGuard;
import com.resumepilot.application.billing.ConsumptionHold;
import com.resumepilot.domain.admin.AiUsageLog;
import com.resumepilot.domain.admin.AiUsageLogRepository;
import com.resumepilot.domain.experience.*;
import com.resumepilot.domain.llm.LlmOperation;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.presentation.dto.experience.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExperienceChatService {

    private static final int MAX_HISTORY_MESSAGES = 24;

    private final ExperienceChatSessionRepository sessionRepository;
    private final ExperienceChatMessageRepository messageRepository;
    private final ExperienceRepository experienceRepository;
    private final ExperienceService experienceService;
    private final AiGatewayClient aiGatewayClient;
    private final BillingGuard billingGuard;
    private final AiUsageLogRepository usageLogRepository;
    private final PlatformTransactionManager transactionManager;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ExperienceChatSessionSummaryResponse> listSessions(UUID userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExperienceChatSessionDetailResponse getSession(UUID userId, UUID sessionId) {
        return toDetail(getOwnedSession(userId, sessionId));
    }

    @Transactional(readOnly = true)
    public ExperienceChatSessionSummaryResponse findSessionForExperience(UUID userId, UUID experienceId) {
        getOwnedExperience(userId, experienceId);
        return findLatestSessionForExperience(userId, experienceId)
                .map(this::toSummary)
                .orElse(null);
    }

    @Transactional
    public ExperienceChatSessionDetailResponse resumeOrCreateForExperience(UUID userId, UUID experienceId) {
        getOwnedExperience(userId, experienceId);
        Optional<ExperienceChatSession> existing = findLatestSessionForExperience(userId, experienceId);
        if (existing.isPresent()) {
            return resumeSession(userId, existing.get().getId());
        }
        return createSession(userId, new CreateExperienceChatSessionRequest(experienceId));
    }

    @Transactional
    public ExperienceChatSessionDetailResponse resumeSession(UUID userId, UUID sessionId) {
        ExperienceChatSession session = getOwnedSession(userId, sessionId);
        if (session.getStatus() == ExperienceChatSessionStatus.APPLIED) {
            session.setStatus(ExperienceChatSessionStatus.ACTIVE);
            sessionRepository.save(session);
            messageRepository.save(ExperienceChatMessage.builder()
                    .sessionId(sessionId)
                    .role(ExperienceChatMessageRole.assistant)
                    .content("이전 대화를 이어갑니다. 더 정리하거나 수정할 내용을 알려주세요.")
                    .draftSnapshot(session.getLatestDraft())
                    .build());
        }
        return toDetail(session);
    }

    @Transactional
    public ExperienceChatSessionDetailResponse createSession(UUID userId, CreateExperienceChatSessionRequest request) {
        UUID targetId = request != null ? request.targetExperienceId() : null;
        Map<String, Object> initialDraft = Map.of();
        String title = "새 경험";

        if (targetId != null) {
            Experience exp = getOwnedExperience(userId, targetId);
            initialDraft = experienceToDraft(exp);
            title = exp.getTitle();
        }

        ExperienceChatSession session = ExperienceChatSession.builder()
                .userId(userId)
                .title(title)
                .targetExperienceId(targetId)
                .latestDraft(initialDraft)
                .build();
        sessionRepository.save(session);

        if (targetId != null) {
            messageRepository.save(ExperienceChatMessage.builder()
                    .sessionId(session.getId())
                    .role(ExperienceChatMessageRole.assistant)
                    .content("선택한 경험을 바탕으로 함께 다듬을게요. 바꾸고 싶은 부분이나 추가로 말하고 싶은 내용을 알려주세요.")
                    .draftSnapshot(initialDraft)
                    .build());
        } else {
            messageRepository.save(ExperienceChatMessage.builder()
                    .sessionId(session.getId())
                    .role(ExperienceChatMessageRole.assistant)
                    .content("안녕하세요! 어떤 경험을 정리해 볼까요? 프로젝트나 활동, 맡은 역할, 성과를 편하게 말씀해 주세요.")
                    .draftSnapshot(Map.of())
                    .build());
        }

        return toDetail(session);
    }

    @Transactional
    public ExperienceChatTurnResponse sendMessage(UUID userId, UUID sessionId, SendExperienceChatMessageRequest request) {
        if (request.message() == null || request.message().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "메시지를 입력해 주세요.");
        }
        ExperienceChatSession session = getOwnedSession(userId, sessionId);
        if (session.getStatus() != ExperienceChatSessionStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "종료된 대화입니다. 새 세션을 시작해 주세요.");
        }

        String userText = request.message().trim();
        ExperienceChatMessage userMsg = messageRepository.save(ExperienceChatMessage.builder()
                .sessionId(sessionId)
                .role(ExperienceChatMessageRole.user)
                .content(userText)
                .build());

        List<ExperienceChatMessage> history = messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (history.size() > MAX_HISTORY_MESSAGES) {
            history = history.subList(history.size() - MAX_HISTORY_MESSAGES, history.size());
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("mode", session.getTargetExperienceId() != null ? "edit" : "create");
        payload.put("user_message", userText);
        payload.put("current_draft", session.getLatestDraft() != null ? session.getLatestDraft() : Map.of());
        payload.put("chat_history", history.stream()
                .filter(m -> !m.getId().equals(userMsg.getId()))
                .map(m -> Map.of("role", m.getRole().name(), "content", m.getContent()))
                .toList());

        if (session.getTargetExperienceId() != null) {
            Experience exp = getOwnedExperience(userId, session.getTargetExperienceId());
            payload.put("existing_experience", experienceToDraft(exp));
        }

        long start = System.currentTimeMillis();
        ConsumptionHold hold = billingGuard.consume(userId, LlmOperation.EXPERIENCE_CHAT);
        Map<String, Object> aiResult;
        try {
            aiResult = aiGatewayClient.coachExperience(payload);
        } catch (RuntimeException e) {
            billingGuard.refund(hold);
            logUsage(userId, start, false, null, e.getMessage(), sessionId);
            throw e;
        }

        String reply = str(aiResult.get("reply"));
        if (reply.isBlank()) {
            billingGuard.refund(hold);
            logUsage(userId, start, false, str(aiResult.get("model")), "empty reply", sessionId);
            throw new BusinessException(ErrorCode.AI_SERVICE_ERROR, "AI 응답을 처리하지 못했습니다.");
        }

        Map<String, Object> draft = castMap(aiResult.get("draft"));
        List<String> missing = toStringList(aiResult.get("missingFields"));

        session.setLatestDraft(draft);
        String draftTitle = str(draft.get("title"));
        if (!draftTitle.isBlank()) {
            session.setTitle(draftTitle.length() > 200 ? draftTitle.substring(0, 200) : draftTitle);
        }
        sessionRepository.save(session);

        ExperienceChatMessage assistantMsg = messageRepository.save(ExperienceChatMessage.builder()
                .sessionId(sessionId)
                .role(ExperienceChatMessageRole.assistant)
                .content(reply)
                .draftSnapshot(draft)
                .build());

        logUsage(userId, start, true, str(aiResult.get("model")), null, sessionId);

        return new ExperienceChatTurnResponse(
                toMessage(userMsg),
                toMessage(assistantMsg),
                draft,
                missing,
                str(aiResult.get("model"))
        );
    }

    @Transactional
    public ApplyExperienceChatDraftResponse applyDraft(UUID userId, UUID sessionId) {
        ExperienceChatSession session = getOwnedSession(userId, sessionId);
        Map<String, Object> draft = session.getLatestDraft();
        if (draft == null || draft.isEmpty() || str(draft.get("title")).isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "저장할 제목이 있는 draft가 필요합니다.");
        }

        ExperienceCreateRequest createReq = draftToCreateRequest(draft);
        ExperienceResponse saved;

        UUID updateTarget = session.getAppliedExperienceId() != null
                ? session.getAppliedExperienceId()
                : session.getTargetExperienceId();

        if (updateTarget != null) {
            saved = experienceService.update(userId, updateTarget, draftToUpdateRequest(draft));
        } else {
            saved = experienceService.create(userId, createReq);
        }

        session.setAppliedExperienceId(saved.id());
        session.setTargetExperienceId(saved.id());
        session.setStatus(ExperienceChatSessionStatus.ACTIVE);
        session.setLatestDraft(experienceToDraft(getOwnedExperience(userId, saved.id())));
        sessionRepository.save(session);

        messageRepository.save(ExperienceChatMessage.builder()
                .sessionId(sessionId)
                .role(ExperienceChatMessageRole.assistant)
                .content("경험 라이브러리에 저장했습니다. 더 보강하고 싶은 내용이 있으면 이어서 말씀해 주세요.")
                .draftSnapshot(session.getLatestDraft())
                .build());

        return new ApplyExperienceChatDraftResponse(saved, sessionId);
    }

    @Transactional
    public void deleteSession(UUID userId, UUID sessionId) {
        sessionRepository.delete(getOwnedSession(userId, sessionId));
    }

    private ExperienceChatSession getOwnedSession(UUID userId, UUID sessionId) {
        ExperienceChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return session;
    }

    private Experience getOwnedExperience(UUID userId, UUID id) {
        Experience experience = experienceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!experience.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return experience;
    }

    private Optional<ExperienceChatSession> findLatestSessionForExperience(UUID userId, UUID experienceId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .filter(s -> experienceId.equals(s.getTargetExperienceId())
                        || experienceId.equals(s.getAppliedExperienceId()))
                .findFirst();
    }

    private Map<String, Object> experienceToDraft(Experience e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", e.getType().name());
        m.put("title", e.getTitle());
        putIfPresent(m, "description", e.getDescription());
        putIfPresent(m, "role", e.getRole());
        putIfPresent(m, "contribution", e.getContribution());
        putIfPresent(m, "result", e.getResult());
        putIfPresent(m, "numericResult", e.getNumericResult());
        putIfPresent(m, "starSituation", e.getStarSituation());
        putIfPresent(m, "starTask", e.getStarTask());
        putIfPresent(m, "starAction", e.getStarAction());
        putIfPresent(m, "starResult", e.getStarResult());
        m.put("skills", e.getSkills() != null ? e.getSkills() : List.of());
        if (e.getStartDate() != null) m.put("startDate", e.getStartDate().toString());
        if (e.getEndDate() != null) m.put("endDate", e.getEndDate().toString());
        return m;
    }

    private ExperienceCreateRequest draftToCreateRequest(Map<String, Object> draft) {
        return new ExperienceCreateRequest(
                parseType(draft.get("type")),
                str(draft.get("title")),
                optionalStr(draft.get("description")),
                optionalStr(draft.get("role")),
                optionalStr(draft.get("contribution")),
                optionalStr(draft.get("result")),
                optionalStr(draft.get("numericResult")),
                optionalStr(draft.get("starSituation")),
                optionalStr(draft.get("starTask")),
                optionalStr(draft.get("starAction")),
                optionalStr(draft.get("starResult")),
                parseSkills(draft.get("skills")),
                parseDate(draft.get("startDate")),
                parseDate(draft.get("endDate"))
        );
    }

    private ExperienceUpdateRequest draftToUpdateRequest(Map<String, Object> draft) {
        return new ExperienceUpdateRequest(
                parseTypeOrNull(draft.get("type")),
                str(draft.get("title")),
                optionalStr(draft.get("description")),
                optionalStr(draft.get("role")),
                optionalStr(draft.get("contribution")),
                optionalStr(draft.get("result")),
                optionalStr(draft.get("numericResult")),
                optionalStr(draft.get("starSituation")),
                optionalStr(draft.get("starTask")),
                optionalStr(draft.get("starAction")),
                optionalStr(draft.get("starResult")),
                parseSkills(draft.get("skills")),
                parseDate(draft.get("startDate")),
                parseDate(draft.get("endDate")),
                parseOngoingOrNull(draft.get("ongoing"))
        );
    }

    private Boolean parseOngoingOrNull(Object o) {
        if (o == null) return null;
        if (o instanceof Boolean b) return b;
        String s = str(o).trim();
        if (s.isEmpty()) return null;
        if ("true".equalsIgnoreCase(s) || "1".equals(s)) return true;
        if ("false".equalsIgnoreCase(s) || "0".equals(s)) return false;
        return null;
    }

    private ExperienceType parseType(Object o) {
        try {
            return ExperienceType.valueOf(str(o).toUpperCase());
        } catch (Exception e) {
            return ExperienceType.PROJECT;
        }
    }

    private ExperienceType parseTypeOrNull(Object o) {
        if (o == null || str(o).isBlank()) return null;
        return parseType(o);
    }

    private List<String> parseSkills(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(v -> str(v).trim()).filter(s -> !s.isEmpty()).distinct().toList();
        }
        return List.of();
    }

    private LocalDate parseDate(Object o) {
        if (o == null) return null;
        String s = str(o).trim();
        if (s.isEmpty()) return null;
        try {
            return LocalDate.parse(s.length() >= 10 ? s.substring(0, 10) : s);
        } catch (Exception e) {
            return null;
        }
    }

    private String optionalStr(Object o) {
        String s = str(o).trim();
        return s.isEmpty() ? null : s;
    }

    private void putIfPresent(Map<String, Object> m, String key, String value) {
        if (value != null && !value.isBlank()) m.put(key, value);
    }

    private ExperienceChatSessionSummaryResponse toSummary(ExperienceChatSession s) {
        return new ExperienceChatSessionSummaryResponse(
                s.getId(), s.getTitle(), s.getStatus(),
                s.getTargetExperienceId(), s.getAppliedExperienceId(), s.getUpdatedAt());
    }

    private ExperienceChatSessionDetailResponse toDetail(ExperienceChatSession s) {
        List<ExperienceChatMessageResponse> messages = messageRepository
                .findBySessionIdOrderByCreatedAtAsc(s.getId()).stream()
                .map(this::toMessage)
                .toList();
        return new ExperienceChatSessionDetailResponse(
                s.getId(), s.getTitle(), s.getStatus(),
                s.getTargetExperienceId(), s.getAppliedExperienceId(),
                s.getLatestDraft() != null ? s.getLatestDraft() : Map.of(),
                messages, s.getCreatedAt(), s.getUpdatedAt());
    }

    private ExperienceChatMessageResponse toMessage(ExperienceChatMessage m) {
        return new ExperienceChatMessageResponse(
                m.getId(), m.getRole().name(), m.getContent(),
                m.getDraftSnapshot(), m.getCreatedAt());
    }

    private void logUsage(UUID userId, long startMs, boolean success, String model, String error, UUID sessionId) {
        String err = error;
        if (err != null && err.length() > 500) err = err.substring(0, 500);
        final String errFinal = err;
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(status -> usageLogRepository.save(AiUsageLog.builder()
                .userId(userId)
                .service("resume-ai")
                .operation("experience_chat")
                .model(model)
                .durationMs((int) (System.currentTimeMillis() - startMs))
                .status(success ? "SUCCESS" : "FAILED")
                .errorMessage(success ? null : errFinal)
                .metadata(Map.of("session_id", sessionId.toString()))
                .build()));
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object o) {
        if (o instanceof Map<?, ?> map) {
            return objectMapper.convertValue(map, new TypeReference<>() {});
        }
        return Map.of();
    }

    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(v -> str(v)).filter(s -> !s.isBlank()).collect(Collectors.toList());
        }
        return List.of();
    }
}
