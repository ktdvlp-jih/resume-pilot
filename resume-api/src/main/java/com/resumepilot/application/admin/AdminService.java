package com.resumepilot.application.admin;

import com.resumepilot.domain.admin.*;
import com.resumepilot.domain.prompt.*;
import com.resumepilot.domain.skill.SkillCatalogItem;
import com.resumepilot.domain.skill.SkillCatalogRepository;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserProfile;
import com.resumepilot.domain.user.UserProfileRepository;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.domain.user.UserRole;
import com.resumepilot.domain.company.Company;
import com.resumepilot.domain.company.CompanyRepository;
import com.resumepilot.application.mapper.CompanyMapper;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.global.config.SecurityUtils;
import com.resumepilot.infrastructure.ai.PromptServiceClient;
import com.resumepilot.presentation.dto.admin.*;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final AiUsageLogRepository usageLogRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final PromptServiceClient promptServiceClient;
    private final SkillCatalogRepository skillCatalogRepository;

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
        String skill = req.skillPrompt() != null ? req.skillPrompt() : "";
        String rubric = req.rubricPrompt() != null ? req.rubricPrompt() : "";
        String task = req.taskPrompt();
        String output = req.outputPrompt();
        String systemPrompt = PromptSections.compose(persona, guard, skill, rubric, task, output);

        PromptVersion version = promptVersionRepository.save(PromptVersion.builder()
                .promptTemplateId(templateId)
                .versionNumber(nextVersion)
                .personaPrompt(persona)
                .guardPrompt(guard)
                .skillPrompt(skill)
                .rubricPrompt(rubric)
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
                || req.skillPrompt() != null || req.rubricPrompt() != null
                || req.taskPrompt() != null || req.outputPrompt() != null) {
            return PromptSections.compose(
                    req.personaPrompt() != null ? req.personaPrompt() : "",
                    req.guardPrompt() != null ? req.guardPrompt() : "",
                    req.skillPrompt() != null ? req.skillPrompt() : "",
                    req.rubricPrompt() != null ? req.rubricPrompt() : "",
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
        Map<UUID, UserProfile> profiles = userProfileRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(UserProfile::getUserId, p -> p, (a, b) -> a));
        return userRepository.findAll().stream()
                .map(u -> toUserResponse(u, profiles.get(u.getId())))
                .toList();
    }

    @Transactional
    public UserAdminResponse createUser(AdminUserCreateRequest req) {
        String email = req.email().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        UserRole role = actorIsFullAdmin()
                ? (req.role() == null || req.role().isBlank() ? UserRole.USER : parseRole(req.role()))
                : UserRole.USER;
        User user = userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(role)
                .enabled(true)
                .build());
        UserProfile profile = userProfileRepository.save(UserProfile.builder()
                .userId(user.getId())
                .name(blankToNull(req.name()))
                .build());
        return toUserResponse(user, profile);
    }

    @Transactional
    public UserAdminResponse updateUser(UUID id, AdminUserUpdateRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        assertCanEditUserAccount(user);
        if (req.email() != null && !req.email().isBlank()) {
            String email = req.email().trim();
            if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmail(email)) {
                throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }
            user.setEmail(email);
        }
        if (req.password() != null && !req.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        UserProfile profile = userProfileRepository.findByUserId(id)
                .orElseGet(() -> UserProfile.builder().userId(id).build());
        if (req.name() != null) {
            profile.setName(blankToNull(req.name()));
        }
        if (req.phone() != null) {
            profile.setPhone(blankToNull(req.phone()));
        }
        userProfileRepository.save(profile);
        return toUserResponse(user, profile);
    }

    @Transactional
    public UserAdminResponse updateUserRole(UUID id, UserRoleUpdateRequest req) {
        assertFullAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        user.setRole(parseRole(req.role()));
        return toUserResponse(user);
    }

    @Transactional
    public UserAdminResponse updateUserEnabled(UUID id, UserEnabledUpdateRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        assertCanEditUserAccount(user);
        user.setEnabled(req.enabled());
        return toUserResponse(user);
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
        return usageLogRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(l -> new AiLogResponse(
                        l.getId(),
                        l.getUserId(),
                        l.getService(),
                        l.getOperation(),
                        l.getModel(),
                        l.getInputTokens(),
                        l.getOutputTokens(),
                        l.getDurationMs(),
                        l.getStatus(),
                        l.getErrorMessage(),
                        l.getMetadata() != null ? l.getMetadata() : Map.of(),
                        l.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public GenerateLengthStatsResponse generateLengthStats() {
        List<GenerateLengthStats.Sample> samples = new java.util.ArrayList<>();
        for (AiUsageLog log : usageLogRepository.findTop200ByOperationIgnoreCaseOrderByCreatedAtDesc("generate")) {
            Object raw = log.getMetadata() == null ? null : log.getMetadata().get("sections");
            if (!(raw instanceof List<?> rows)) {
                continue;
            }
            for (Object row : rows) {
                if (!(row instanceof Map<?, ?> map)) {
                    continue;
                }
                String quality = map.get("quality") == null ? "" : String.valueOf(map.get("quality"));
                if ("skipped".equals(quality)) {
                    continue;
                }
                int target = GenerateLogMetadata.toInt(map.get("target_chars"), 0);
                if (target <= 0) {
                    continue;
                }
                samples.add(new GenerateLengthStats.Sample(
                        target,
                        GenerateLogMetadata.toInt(map.get("output_chars"), 0),
                        quality,
                        map.get("title") == null ? "" : String.valueOf(map.get("title")),
                        log.getModel(),
                        log.getCreatedAt()));
            }
        }
        GenerateLengthStats.Result result = GenerateLengthStats.from(samples);
        return new GenerateLengthStatsResponse(
                result.sampleCount(),
                result.unreliableFromChars(),
                GenerateLengthStats.UNRELIABLE_RATE,
                GenerateLengthStats.MIN_BUCKET_N,
                GenerateLengthStats.UI_MIN_CHARS,
                GenerateLengthStats.UI_MAX_CHARS,
                GenerateLengthStats.UI_DEFAULT_CHARS,
                GenerateLengthStats.GENERATE_MAX_TOKENS,
                result.buckets().stream()
                        .map(b -> new GenerateLengthStatsResponse.Bucket(
                                b.from(), b.to(), b.n(), b.ok(), b.shortCount(), b.truncated(),
                                b.error(), b.overshoot(), b.insufficient(), b.medianOutput(), b.unreliableRate()))
                        .toList(),
                result.recent().stream()
                        .map(s -> new GenerateLengthStatsResponse.Recent(
                                s.createdAt(), s.model(), s.title(), s.targetChars(), s.outputChars(), s.quality()))
                        .toList());
    }

    @Transactional(readOnly = true)
    public List<SkillCatalogAdminResponse> listSkillCatalog() {
        return skillCatalogRepository.findAllByOrderByCategoryAscNameAsc().stream()
                .map(SkillCatalogAdminResponse::from)
                .toList();
    }

    @Transactional
    public SkillCatalogAdminResponse createSkillCatalog(SkillCatalogCreateRequest req) {
        try {
            SkillCatalogItem item = skillCatalogRepository.save(SkillCatalogItem.builder()
                    .name(req.name().trim())
                    .category(req.category().trim())
                    .build());
            return SkillCatalogAdminResponse.from(item);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.CONFLICT, "Skill already exists: " + req.name());
        }
    }

    @Transactional
    public SkillCatalogAdminResponse updateSkillCatalog(Long id, SkillCatalogUpdateRequest req) {
        SkillCatalogItem item = skillCatalogRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (req.name() != null && !req.name().isBlank()) item.setName(req.name().trim());
        if (req.category() != null && !req.category().isBlank()) item.setCategory(req.category().trim());
        try {
            return SkillCatalogAdminResponse.from(skillCatalogRepository.save(item));
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.CONFLICT, "Skill already exists: " + req.name());
        }
    }

    @Transactional
    public void deleteSkillCatalog(Long id) {
        skillCatalogRepository.deleteById(id);
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
                v.getSkillPrompt(),
                v.getRubricPrompt(),
                v.getTaskPrompt(),
                v.getOutputPrompt(),
                v.getSystemPrompt(),
                v.getUserPrompt(),
                v.isActive());
    }

    private UserAdminResponse toUserResponse(User user) {
        return toUserResponse(user, userProfileRepository.findByUserId(user.getId()).orElse(null));
    }

    private UserAdminResponse toUserResponse(User user, UserProfile profile) {
        return new UserAdminResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                profile != null ? profile.getName() : null,
                profile != null ? profile.getPhone() : null,
                user.isEnabled(),
                user.getCreatedAt());
    }

    private UserRole actorRole() {
        return parseRole(SecurityUtils.getCurrentRole());
    }

    private boolean actorIsFullAdmin() {
        return actorRole().isFullAdmin();
    }

    private void assertFullAdmin() {
        if (!actorIsFullAdmin()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "전체 관리자만 권한을 변경할 수 있습니다.");
        }
    }

    private void assertCanEditUserAccount(User target) {
        if (actorIsFullAdmin()) {
            return;
        }
        if (target.getRole() != UserRole.USER) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "일반 사용자만 수정할 수 있습니다.");
        }
    }

    private UserRole parseRole(String role) {
        if (role == null || role.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "권한을 선택해 주세요.");
        }
        try {
            return UserRole.valueOf(role.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "지원하지 않는 권한입니다.");
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
