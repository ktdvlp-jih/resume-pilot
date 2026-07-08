package com.resumepilot.application.admin;

import com.resumepilot.domain.admin.*;
import com.resumepilot.domain.prompt.*;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import com.resumepilot.domain.company.Company;
import com.resumepilot.domain.company.CompanyRepository;
import com.resumepilot.application.mapper.CompanyMapper;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.ai.PromptServiceClient;
import com.resumepilot.presentation.dto.admin.*;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    public static final String KEY_DEPLOY_AI_E2E = "deploy_ai_e2e_enabled";
    public static final String KEY_DEPLOY_E2E = "deploy_e2e_enabled";

    private final PromptTemplateRepository promptRepository;
    private final PromptVersionRepository promptVersionRepository;
    private final PromptHistoryRepository promptHistoryRepository;
    private final ForbiddenExpressionRepository forbiddenRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final AiUsageLogRepository usageLogRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final PromptServiceClient promptServiceClient;

    @Transactional(readOnly = true)
    public List<PromptAdminResponse> listPrompts() {
        return promptRepository.findAll().stream()
                .map(p -> new PromptAdminResponse(p.getId(), p.getType(), p.getName(), p.getDescription(), p.getActiveVersionId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PromptVersionResponse> listPromptVersions(UUID templateId) {
        getPromptTemplate(templateId);
        return promptVersionRepository.findByPromptTemplateIdOrderByVersionNumberDesc(templateId).stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @Transactional
    public PromptVersionResponse createPromptVersion(UUID templateId, PromptVersionCreateRequest req, UUID adminId) {
        PromptTemplate template = getPromptTemplate(templateId);
        int nextVersion = promptVersionRepository.findTopByPromptTemplateIdOrderByVersionNumberDesc(templateId)
                .map(v -> v.getVersionNumber() + 1).orElse(1);

        String persona = req.personaPrompt();
        String guard = req.guardPrompt();
        String task = req.taskPrompt();
        String output = req.outputPrompt();
        String systemPrompt = PromptSections.compose(persona, guard, task, output);

        PromptVersion version = promptVersionRepository.save(PromptVersion.builder()
                .promptTemplateId(templateId)
                .versionNumber(nextVersion)
                .personaPrompt(persona)
                .guardPrompt(guard)
                .taskPrompt(task)
                .outputPrompt(output)
                .systemPrompt(systemPrompt)
                .userPrompt(req.userPrompt())
                .createdBy(adminId)
                .build());

        promptHistoryRepository.save(PromptHistory.builder()
                .promptVersionId(version.getId())
                .action("CREATE")
                .changedBy(adminId)
                .changeDetail(Map.of("version_number", nextVersion))
                .build());

        template.setActiveVersionId(version.getId());
        version.setActive(true);
        promptVersionRepository.findByPromptTemplateIdOrderByVersionNumberDesc(templateId).stream()
                .filter(v -> !v.getId().equals(version.getId()))
                .forEach(v -> { v.setActive(false); promptVersionRepository.save(v); });

        return toVersionResponse(version);
    }

    @Transactional
    public PromptVersionResponse activatePromptVersion(UUID templateId, UUID versionId, UUID adminId) {
        PromptTemplate template = getPromptTemplate(templateId);
        PromptVersion version = promptVersionRepository.findById(versionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!version.getPromptTemplateId().equals(templateId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Version does not belong to template");
        }

        promptVersionRepository.findByPromptTemplateIdOrderByVersionNumberDesc(templateId)
                .forEach(v -> { v.setActive(v.getId().equals(versionId)); promptVersionRepository.save(v); });

        template.setActiveVersionId(versionId);
        promptRepository.save(template);

        promptHistoryRepository.save(PromptHistory.builder()
                .promptVersionId(versionId)
                .action("ACTIVATE")
                .changedBy(adminId)
                .build());

        return toVersionResponse(version);
    }

    @Transactional(readOnly = true)
    public PromptTestResponse testPrompt(PromptTestRequest req) {
        String systemPrompt = resolveSystemPrompt(req);
        Map<String, Object> result = promptServiceClient.testPrompt(
                req.promptType(), systemPrompt, req.userPrompt(), req.variables());
        Object testResult = result.get("result");
        return new PromptTestResponse(testResult != null ? String.valueOf(testResult) : "no result");
    }

    private String resolveSystemPrompt(PromptTestRequest req) {
        if (req.systemPrompt() != null && !req.systemPrompt().isBlank()) {
            return req.systemPrompt();
        }
        if (req.personaPrompt() != null || req.guardPrompt() != null
                || req.taskPrompt() != null || req.outputPrompt() != null) {
            return PromptSections.compose(
                    req.personaPrompt() != null ? req.personaPrompt() : "",
                    req.guardPrompt() != null ? req.guardPrompt() : "",
                    req.taskPrompt() != null ? req.taskPrompt() : "",
                    req.outputPrompt() != null ? req.outputPrompt() : "");
        }
        throw new BusinessException(ErrorCode.INVALID_INPUT, "system prompt or sections required");
    }

    @Transactional(readOnly = true)
    public List<ForbiddenExpressionResponse> listForbidden() {
        return forbiddenRepository.findAll().stream()
                .map(f -> new ForbiddenExpressionResponse(f.getId(), f.getExpression(), f.getSuggestion(), f.getSeverity(), f.isEnabled()))
                .toList();
    }

    @Transactional
    public ForbiddenExpressionResponse createForbidden(ForbiddenCreateRequest req) {
        ForbiddenExpression f = forbiddenRepository.save(ForbiddenExpression.builder()
                .expression(req.expression())
                .suggestion(req.suggestion())
                .severity(req.severity() != null ? req.severity() : "WARNING")
                .build());
        return new ForbiddenExpressionResponse(f.getId(), f.getExpression(), f.getSuggestion(), f.getSeverity(), f.isEnabled());
    }

    @Transactional
    public void deleteForbidden(UUID id) {
        forbiddenRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserAdminResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserAdminResponse(u.getId(), u.getEmail(), u.getRole().name(), u.isEnabled(), u.getCreatedAt()))
                .toList();
    }

    @Transactional
    public UserAdminResponse updateUserRole(UUID id, UserRoleUpdateRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        user.setRole(UserRole.valueOf(req.role()));
        return new UserAdminResponse(user.getId(), user.getEmail(), user.getRole().name(), user.isEnabled(), user.getCreatedAt());
    }

    @Transactional
    public UserAdminResponse updateUserEnabled(UUID id, UserEnabledUpdateRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        user.setEnabled(req.enabled());
        return new UserAdminResponse(user.getId(), user.getEmail(), user.getRole().name(), user.isEnabled(), user.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> listCompanies() {
        return companyRepository.findAll().stream().map(companyMapper::toResponse).toList();
    }

    @Transactional
    public CompanyResponse updateCompany(UUID id, CompanyUpdateRequest req) {
        Company company = companyRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (req.coreValues() != null) company.setCoreValues(req.coreValues());
        if (req.talentProfile() != null) company.setTalentProfile(req.talentProfile());
        if (req.techStack() != null) company.setTechStack(req.techStack());
        if (req.culture() != null) company.setCulture(req.culture());
        if (req.hiringKeywords() != null) company.setHiringKeywords(req.hiringKeywords());
        return companyMapper.toResponse(companyRepository.save(company));
    }

    @Transactional(readOnly = true)
    public List<AiLogResponse> listAiLogs() {
        return usageLogRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(l -> new AiLogResponse(l.getId(), l.getUserId(), l.getService(), l.getOperation(),
                        l.getDurationMs(), l.getStatus(), l.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public DeployCiSettingsResponse getDeployCiSettings() {
        return new DeployCiSettingsResponse(
                readBooleanSetting(KEY_DEPLOY_AI_E2E, true),
                readBooleanSetting(KEY_DEPLOY_E2E, true),
                latestSettingUpdatedAt()
        );
    }

    @Transactional
    public DeployCiSettingsResponse updateDeployCiSettings(DeployCiSettingsUpdateRequest req, UUID adminId) {
        if (req.deployAiE2eEnabled() != null) {
            upsertSetting(KEY_DEPLOY_AI_E2E, req.deployAiE2eEnabled(), adminId);
        }
        if (req.deployE2eEnabled() != null) {
            upsertSetting(KEY_DEPLOY_E2E, req.deployE2eEnabled(), adminId);
        }
        return getDeployCiSettings();
    }

    private boolean readBooleanSetting(String key, boolean defaultValue) {
        return systemSettingRepository.findById(key)
                .map(s -> parseBoolean(s.getSettingValue(), defaultValue))
                .orElse(defaultValue);
    }

    private boolean parseBoolean(String value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        String normalized = value.trim().toLowerCase();
        if ("true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized)) {
            return true;
        }
        if ("false".equals(normalized) || "0".equals(normalized) || "no".equals(normalized)) {
            return false;
        }
        return defaultValue;
    }

    private void upsertSetting(String key, boolean enabled, UUID adminId) {
        SystemSetting setting = systemSettingRepository.findById(key)
                .orElse(SystemSetting.builder().settingKey(key).build());
        setting.setSettingValue(Boolean.toString(enabled));
        setting.setUpdatedBy(adminId);
        systemSettingRepository.save(setting);
    }

    private Instant latestSettingUpdatedAt() {
        return systemSettingRepository.findAll().stream()
                .map(SystemSetting::getUpdatedAt)
                .filter(java.util.Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
    }

    private PromptTemplate getPromptTemplate(UUID id) {
        return promptRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Prompt template not found"));
    }

    private PromptVersionResponse toVersionResponse(PromptVersion v) {
        return new PromptVersionResponse(
                v.getId(),
                v.getPromptTemplateId(),
                v.getVersionNumber(),
                v.getPersonaPrompt(),
                v.getGuardPrompt(),
                v.getTaskPrompt(),
                v.getOutputPrompt(),
                v.getSystemPrompt(),
                v.getUserPrompt(),
                v.isActive());
    }
}
