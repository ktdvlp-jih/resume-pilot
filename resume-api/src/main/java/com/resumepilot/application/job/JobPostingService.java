package com.resumepilot.application.job;

import com.resumepilot.application.company.CompanyService;
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
        if (doc.text() != null && posting.getRawContent() == null) {
            posting.setRawContent(String.valueOf(aiResult.getOrDefault("raw_content", doc.text())));
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
    public JobAnalysisResponse reanalyze(UUID userId, UUID jobPostingId) {
        JobPosting posting = getOwned(userId, jobPostingId);
        Map<String, Object> aiResult = analyzeWithAi(
                posting.getSourceType().name(),
                posting.getRawContent(),
                posting.getSourceUrl(),
                null,
                null
        );
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
            return request.content() != null ? request.content() : request.sourceUrl();
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
                .talentProfile(toStringList(aiResult.get("talent_profile")))
                .coreCompetencies(toStringList(aiResult.get("core_competencies")))
                .techKeywords(toStringList(aiResult.get("tech_keywords")))
                .jobDescription(str(aiResult.get("job_description")))
                .orgCulture(str(aiResult.get("org_culture")))
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
        return new JobAnalysisResponse(
                a.getId(), a.getJobPostingId(), a.getCompanyName(), a.getPosition(),
                a.getRequiredSkills(), a.getPreferredSkills(), a.getTalentProfile(),
                a.getCoreCompetencies(), a.getTechKeywords(), a.getJobDescription(),
                a.getOrgCulture(), a.getFitScore(), a.getAnalysisJson(), a.getCreatedAt()
        );
    }

    private String str(Object o) {
        return o != null ? String.valueOf(o) : null;
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object o) {
        if (o instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
