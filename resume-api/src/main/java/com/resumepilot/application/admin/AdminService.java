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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PromptTemplateRepository promptRepository;
    private final PromptVersionRepository promptVersionRepository;
    private final PromptHistoryRepository promptHistoryRepository;
    private final ForbiddenExpressionRepository forbiddenRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final AiUsageLogRepository usageLogRepository;
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

        PromptVersion version = promptVersionRepository.save(PromptVersion.builder()
                .promptTemplateId(templateId)
                .versionNumber(nextVersion)
                .systemPrompt(req.systemPrompt())
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
        Map<String, Object> result = promptServiceClient.testPrompt(
                req.promptType(), req.systemPrompt(), req.userPrompt(), req.variables());
        Object testResult = result.get("result");
        return new PromptTestResponse(testResult != null ? String.valueOf(testResult) : "no result");
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

    private PromptTemplate getPromptTemplate(UUID id) {
        return promptRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Prompt template not found"));
    }

    private PromptVersionResponse toVersionResponse(PromptVersion v) {
        return new PromptVersionResponse(v.getId(), v.getPromptTemplateId(), v.getVersionNumber(),
                v.getSystemPrompt(), v.getUserPrompt(), v.isActive());
    }
}
