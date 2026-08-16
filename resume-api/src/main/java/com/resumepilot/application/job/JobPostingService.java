package com.resumepilot.application.job;

import com.resumepilot.application.company.CompanyService;
import com.resumepilot.domain.admin.AiUsageLog;
import com.resumepilot.domain.admin.AiUsageLogRepository;
import com.resumepilot.domain.company.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.ai.AiGatewayClient;
import com.resumepilot.infrastructure.document.DocumentExtractor;
import com.resumepilot.presentation.dto.job.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class JobPostingService {

    private final JobPostingRepository jobPostingRepository;
    private final JobAnalysisRepository jobAnalysisRepository;
    private final CompanyRepository companyRepository;
    private final CompanyService companyService;
    private final AiGatewayClient aiGatewayClient;
    private final DocumentExtractor documentExtractor;
    private final AiUsageLogRepository usageLogRepository;

    @Transactional(readOnly = true)
    public List<JobPostingResponse> list(UUID userId) {
        return jobPostingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toPostingResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public JobPostingResponse get(UUID userId, UUID id) {
        return toPostingResponse(getOwned(userId, id));
    }

    @Transactional
    public JobPostingResponse upload(UUID userId, JobPostingUploadRequest request) {
        if (request.sourceType() == JobSourceType.TEXT
                && (request.title() == null || request.title().isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "텍스트/이미지 공고는 제목을 입력해 주세요.");
        }
        long startedAt = System.currentTimeMillis();
        String content = resolveContent(request);

        JobPosting posting = JobPosting.builder()
                .userId(userId)
                .title(request.title())
                .sourceType(request.sourceType())
                .sourceUrl(request.sourceUrl())
                .rawContent(content)
                .build();
        jobPostingRepository.save(posting);

        Map<String, Object> aiResult = analyzeWithAi(request.sourceType().name(), content, request.sourceUrl(), null, null);
        logUsage(userId, request.sourceType().name(), startedAt, !aiResult.containsKey("error"), aiResult);
        if (request.sourceType() == JobSourceType.URL && aiResult.containsKey("error")) {
            throw new BusinessException(
                    ErrorCode.INVALID_INPUT,
                    "채용공고 URL에서 본문을 가져오지 못했습니다. 링크를 확인하거나 텍스트로 붙여넣어 주세요."
            );
        }
        Object rawFromAi = aiResult.get("raw_content");
        if (rawFromAi != null && !String.valueOf(rawFromAi).isBlank()) {
            posting.setRawContent(String.valueOf(rawFromAi));
        }
        posting.setParsedJson(aiResult);
        if (aiResult.get("title") != null && posting.getTitle() == null) {
            posting.setTitle(String.valueOf(aiResult.get("title")));
        }

        Company company = companyService.upsertFromAnalysis(aiResult);
        if (company != null) {
            posting.setCompanyId(company.getId());
        }

        saveAnalysis(posting.getId(), aiResult);
        return toPostingResponse(posting);
    }

    @Transactional
    public JobPostingResponse uploadFile(UUID userId, MultipartFile file, String title) {
        if (title == null || title.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "텍스트/이미지 공고는 제목을 입력해 주세요.");
        }
        long startedAt = System.currentTimeMillis();
        DocumentExtractor.ExtractedDocument doc = documentExtractor.extract(file);
        JobSourceType sourceType = JobSourceType.valueOf(doc.sourceType());

        JobPosting posting = JobPosting.builder()
                .userId(userId)
                .title(title != null ? title : doc.filename())
                .sourceType(sourceType)
                .rawContent(doc.text())
                .build();
        jobPostingRepository.save(posting);

        Map<String, Object> aiResult = analyzeWithAi(
                sourceType.name(),
                doc.text() != null ? doc.text() : "",
                null,
                doc.fileBase64(),
                doc.mimeType()
        );
        logUsage(userId, sourceType.name(), startedAt, !aiResult.containsKey("error"), aiResult);
        Object rawFromAi = aiResult.get("raw_content");
        if (rawFromAi != null && !String.valueOf(rawFromAi).isBlank()) {
            posting.setRawContent(String.valueOf(rawFromAi));
        } else if (doc.text() != null && !doc.text().isBlank()) {
            posting.setRawContent(doc.text());
        }
        posting.setParsedJson(aiResult);
        if (aiResult.get("title") != null && posting.getTitle() == null) {
            posting.setTitle(String.valueOf(aiResult.get("title")));
        }

        Company company = companyService.upsertFromAnalysis(aiResult);
        if (company != null) {
            posting.setCompanyId(company.getId());
        }

        saveAnalysis(posting.getId(), aiResult);
        return toPostingResponse(posting);
    }

    @Transactional(readOnly = true)
    public JobAnalysisResponse getAnalysis(UUID userId, UUID jobPostingId) {
        getOwned(userId, jobPostingId);
        JobAnalysis analysis = jobAnalysisRepository.findTopByJobPostingIdOrderByCreatedAtDesc(jobPostingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Analysis not found"));
        return toAnalysisResponse(analysis);
    }

    @Transactional
    public JobAnalysisResponse updateAnalysis(UUID userId, UUID jobPostingId, JobAnalysisUpdateRequest request) {
        JobPosting posting = getOwned(userId, jobPostingId);
        JobAnalysis analysis = jobAnalysisRepository.findTopByJobPostingIdOrderByCreatedAtDesc(jobPostingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Analysis not found"));

        if (request.companyName() != null) {
            analysis.setCompanyName(blankToNull(request.companyName()));
        }
        if (request.position() != null) {
            analysis.setPosition(blankToNull(request.position()));
        }
        if (request.jobDescription() != null) {
            analysis.setJobDescription(blankToNull(request.jobDescription()));
        }
        if (request.requiredSkills() != null) {
            analysis.setRequiredSkills(cleanList(request.requiredSkills()));
        }
        if (request.preferredSkills() != null) {
            analysis.setPreferredSkills(cleanList(request.preferredSkills()));
        }
        if (request.qualifications() != null) {
            analysis.setQualifications(cleanList(request.qualifications()));
        }
        if (request.jobResponsibilities() != null) {
            analysis.setJobResponsibilities(cleanList(request.jobResponsibilities()));
        }
        if (request.talentProfile() != null) {
            analysis.setTalentProfile(cleanList(request.talentProfile()));
        }
        if (request.coreCompetencies() != null) {
            analysis.setCoreCompetencies(cleanList(request.coreCompetencies()));
        }
        if (request.techKeywords() != null) {
            analysis.setTechKeywords(cleanList(request.techKeywords()));
        }
        if (request.orgCulture() != null) {
            analysis.setOrgCulture(joinList(cleanList(request.orgCulture())));
        }

        Map<String, Object> json = new LinkedHashMap<>();
        if (analysis.getAnalysisJson() != null) {
            json.putAll(analysis.getAnalysisJson());
        }
        json.put("company_name", analysis.getCompanyName());
        json.put("position", analysis.getPosition());
        json.put("job_description", analysis.getJobDescription());
        json.put("required_skills", analysis.getRequiredSkills());
        json.put("preferred_skills", analysis.getPreferredSkills());
        json.put("qualifications", analysis.getQualifications());
        json.put("job_responsibilities", analysis.getJobResponsibilities());
        json.put("talent_profile", analysis.getTalentProfile());
        json.put("core_competencies", analysis.getCoreCompetencies());
        json.put("tech_keywords", analysis.getTechKeywords());
        if (request.solutionKeywords() != null) {
            json.put("solution_keywords", cleanList(request.solutionKeywords()));
        }
        if (request.workConditions() != null) {
            json.put("work_conditions", cleanList(request.workConditions()));
        }
        if (request.benefits() != null) {
            json.put("benefits", cleanList(request.benefits()));
        }
        if (request.hiringProcess() != null) {
            json.put("hiring_process", cleanList(request.hiringProcess()));
        }
        if (request.notes() != null) {
            json.put("notes", cleanList(request.notes()));
        }
        if (request.orgCulture() != null) {
            json.put("org_culture", cleanList(request.orgCulture()));
        }
        if (request.recruitmentSections() != null) {
            json.put("recruitment_sections", request.recruitmentSections().stream()
                    .map(this::sectionToMap)
                    .toList());
        }
        analysis.setAnalysisJson(json);
        posting.setParsedJson(json);
        if (request.title() != null && !request.title().isBlank()) {
            posting.setTitle(request.title().trim());
        }

        Company company = companyService.upsertFromAnalysis(json);
        if (company != null) {
            posting.setCompanyId(company.getId());
        }
        return toAnalysisResponse(jobAnalysisRepository.save(analysis));
    }

    @Transactional
    public JobAnalysisResponse reanalyze(UUID userId, UUID jobPostingId) {
        long startedAt = System.currentTimeMillis();
        JobPosting posting = getOwned(userId, jobPostingId);
        Map<String, Object> aiResult = analyzeWithAi(
                posting.getSourceType().name(),
                posting.getRawContent(),
                posting.getSourceUrl(),
                null,
                null
        );
        logUsage(userId, posting.getSourceType().name(), startedAt, !aiResult.containsKey("error"), aiResult);
        posting.setParsedJson(aiResult);
        Company company = companyService.upsertFromAnalysis(aiResult);
        if (company != null) {
            posting.setCompanyId(company.getId());
        }
        return toAnalysisResponse(saveAnalysis(posting.getId(), aiResult));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        jobPostingRepository.delete(getOwned(userId, id));
    }

    private String resolveContent(JobPostingUploadRequest request) {
        if (request.sourceType() == JobSourceType.URL) {
            if (request.sourceUrl() == null || request.sourceUrl().isBlank()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "sourceUrl is required for URL type");
            }
            // URL 문자열(searchword 등)을 본문으로 넣지 않는다. 본문은 AI fetch 결과로 채운다.
            return request.content() != null ? request.content() : "";
        }
        if (request.content() == null || request.content().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "content is required");
        }
        return request.content();
    }

    private Map<String, Object> analyzeWithAi(String sourceType, String content, String sourceUrl,
                                              String fileBase64, String mimeType) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("source_type", sourceType);
        payload.put("content", content != null ? content : "");
        if (sourceUrl != null) {
            payload.put("source_url", sourceUrl);
        }
        if (fileBase64 != null) {
            payload.put("file_base64", fileBase64);
            payload.put("mime_type", mimeType);
        }
        try {
            Map<String, Object> result = aiGatewayClient.analyzeJobPosting(payload);
            return result != null ? result : Map.of();
        } catch (Exception e) {
            return Map.of("company_name", "Unknown", "raw_content", content, "error", e.getMessage());
        }
    }

    private JobAnalysis saveAnalysis(UUID jobPostingId, Map<String, Object> aiResult) {
        JobAnalysis analysis = JobAnalysis.builder()
                .jobPostingId(jobPostingId)
                .companyName(str(aiResult.get("company_name")))
                .position(str(aiResult.get("position")))
                .requiredSkills(toStringList(aiResult.get("required_skills")))
                .preferredSkills(toStringList(aiResult.get("preferred_skills")))
                .qualifications(toStringList(aiResult.get("qualifications")))
                .jobResponsibilities(toStringList(aiResult.get("job_responsibilities")))
                .talentProfile(toStringList(aiResult.get("talent_profile")))
                .coreCompetencies(toStringList(aiResult.get("core_competencies")))
                .techKeywords(toStringList(aiResult.get("tech_keywords")))
                .jobDescription(str(aiResult.get("job_description")))
                .orgCulture(joinList(toStringList(aiResult.get("org_culture"))))
                .fitScore(aiResult.get("fit_score") != null
                        ? new BigDecimal(String.valueOf(aiResult.get("fit_score"))) : null)
                .analysisJson(aiResult)
                .build();
        return jobAnalysisRepository.save(analysis);
    }

    private JobPosting getOwned(UUID userId, UUID id) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!posting.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return posting;
    }

    private JobPostingResponse toPostingResponse(JobPosting p) {
        String companyName = null;
        if (p.getCompanyId() != null) {
            companyName = companyRepository.findById(p.getCompanyId())
                    .map(Company::getName).orElse(null);
        }
        return new JobPostingResponse(
                p.getId(), p.getTitle(), p.getSourceType(), p.getSourceUrl(),
                p.getRawContent(), p.getParsedJson(), p.getCompanyId(), companyName, p.getCreatedAt()
        );
    }

    private JobAnalysisResponse toAnalysisResponse(JobAnalysis a) {
        Map<String, Object> json = a.getAnalysisJson() != null ? a.getAnalysisJson() : Map.of();
        List<String> orgCulture = firstNonEmptyList(
                toStringList(json.get("org_culture")),
                coerceTextList(a.getOrgCulture())
        );
        return new JobAnalysisResponse(
                a.getId(), a.getJobPostingId(), a.getCompanyName(), a.getPosition(),
                a.getRequiredSkills(), a.getPreferredSkills(), a.getQualifications(), a.getJobResponsibilities(),
                a.getTalentProfile(),
                a.getCoreCompetencies(), a.getTechKeywords(),
                toStringList(json.get("solution_keywords")),
                toStringList(json.get("work_conditions")),
                toStringList(json.get("benefits")),
                toStringList(json.get("hiring_process")),
                toStringList(json.get("notes")),
                toStringList(json.get("pain_points")),
                toStringList(json.get("must_solve")),
                toRecruitmentSections(json.get("recruitment_sections")),
                a.getJobDescription(),
                orgCulture, a.getFitScore(), a.getAnalysisJson(), a.getCreatedAt()
        );
    }

    @SuppressWarnings("unchecked")
    private List<RecruitmentSectionResponse> toRecruitmentSections(Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            return List.of();
        }
        List<RecruitmentSectionResponse> out = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                continue;
            }
            String title = str(map.get("title"));
            if (title == null || title.isBlank()) {
                title = str(map.get("name"));
            }
            if (title == null || title.isBlank()) {
                continue;
            }
            out.add(new RecruitmentSectionResponse(
                    title,
                    toStringList(map.get("job_responsibilities")),
                    toStringList(map.get("required_skills")),
                    toStringList(map.get("preferred_skills")),
                    toStringList(map.get("qualifications")),
                    str(map.get("headcount"))
            ));
        }
        return out;
    }

    private Map<String, Object> sectionToMap(RecruitmentSectionResponse section) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("title", section.title());
        map.put("job_responsibilities", cleanList(section.jobResponsibilities()));
        map.put("required_skills", cleanList(section.requiredSkills()));
        map.put("preferred_skills", cleanList(section.preferredSkills()));
        map.put("qualifications", cleanList(section.qualifications()));
        map.put("headcount", blankToNull(section.headcount()));
        return map;
    }

    private List<String> cleanList(List<String> items) {
        if (items == null) {
            return List.of();
        }
        return items.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }

    private String joinList(List<String> items) {
        if (items == null || items.isEmpty()) {
            return null;
        }
        return String.join("\n", items);
    }

    private List<String> firstNonEmptyList(List<String> primary, List<String> fallback) {
        if (primary != null && !primary.isEmpty()) {
            return primary;
        }
        return fallback != null ? fallback : List.of();
    }

    private List<String> coerceTextList(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String trimmed = text.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            // Python/JSON style stringified list: ['a', 'b']
            String inner = trimmed.substring(1, trimmed.length() - 1).trim();
            if (inner.isBlank()) {
                return List.of();
            }
            return java.util.Arrays.stream(inner.split(",(?=(?:[^']*'[^']*')*[^']*$)"))
                    .map(part -> part.trim().replaceAll("^['\"]|['\"]$", ""))
                    .filter(s -> !s.isBlank())
                    .toList();
        }
        return java.util.Arrays.stream(trimmed.split("\\R"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
    }

    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(String::valueOf).filter(s -> s != null && !s.isBlank()).toList();
        }
        if (o instanceof String s) {
            return coerceTextList(s);
        }
        return List.of();
    }

    private void logUsage(UUID userId, String sourceType, long startedAt, boolean success, Map<String, Object> aiResult) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("source_type", sourceType);
        if (aiResult != null) {
            putIfPresent(metadata, "extraction_method", aiResult.get("extraction_method"));
            putIfPresent(metadata, "company_name", aiResult.get("company_name"));
            putIfPresent(metadata, "position", aiResult.get("position"));
            metadata.put("required_skills_count", toStringList(aiResult.get("required_skills")).size());
            metadata.put("preferred_skills_count", toStringList(aiResult.get("preferred_skills")).size());
            metadata.put("job_responsibilities_count", toStringList(aiResult.get("job_responsibilities")).size());
            metadata.put("qualifications_count", toStringList(aiResult.get("qualifications")).size());
            metadata.put("tech_keywords_count", toStringList(aiResult.get("tech_keywords")).size());
            metadata.put("preferred_skills", truncateList(toStringList(aiResult.get("preferred_skills")), 8));
            metadata.put("required_skills", truncateList(toStringList(aiResult.get("required_skills")), 8));
            Object error = aiResult.get("error");
            if (error != null) {
                metadata.put("error", String.valueOf(error));
            }
            Object raw = aiResult.get("raw_content");
            if (raw != null) {
                String rawText = String.valueOf(raw);
                metadata.put("raw_content_preview", rawText.length() > 800 ? rawText.substring(0, 800) + "…" : rawText);
            }
            // Compact snapshot for comparing two runs of the same image
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("company_name", aiResult.get("company_name"));
            snapshot.put("position", aiResult.get("position"));
            snapshot.put("required_skills", truncateList(toStringList(aiResult.get("required_skills")), 12));
            snapshot.put("preferred_skills", truncateList(toStringList(aiResult.get("preferred_skills")), 12));
            snapshot.put("job_responsibilities", truncateList(toStringList(aiResult.get("job_responsibilities")), 8));
            snapshot.put("core_competencies", truncateList(toStringList(aiResult.get("core_competencies")), 8));
            snapshot.put("tech_keywords", truncateList(toStringList(aiResult.get("tech_keywords")), 15));
            snapshot.put("solution_keywords", truncateList(toStringList(aiResult.get("solution_keywords")), 10));
            metadata.put("result_snapshot", snapshot);
        }

        String model = aiResult != null ? str(aiResult.get("model")) : null;
        String errorMessage = null;
        if (aiResult != null && aiResult.get("error") != null) {
            errorMessage = String.valueOf(aiResult.get("error"));
            if (errorMessage.length() > 500) {
                errorMessage = errorMessage.substring(0, 500);
            }
        }

        usageLogRepository.save(AiUsageLog.builder()
                .userId(userId)
                .service("resume-ai")
                .operation("job_analysis")
                .model(model)
                .durationMs((int) (System.currentTimeMillis() - startedAt))
                .status(success ? "SUCCESS" : "FAILED")
                .errorMessage(errorMessage)
                .metadata(metadata)
                .build());
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null && !String.valueOf(value).isBlank()) {
            target.put(key, value);
        }
    }

    private List<String> truncateList(List<String> items, int max) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.size() <= max ? items : items.subList(0, max);
    }
}
