package com.resumepilot.application.resume;

import com.resumepilot.application.rag.RagService;
import com.resumepilot.domain.resume.Resume;
import com.resumepilot.domain.resume.ResumeRepository;
import com.resumepilot.domain.resume.ResumeVersion;
import com.resumepilot.domain.resume.ResumeVersionRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.resume.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final ResumeVersionRepository resumeVersionRepository;
    private final RagService ragService;

    @Transactional(readOnly = true)
    public List<ResumeResponse> list(UUID userId) {
        return resumeRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeResponse get(UUID userId, UUID resumeId) {
        Resume resume = getOwnedResume(userId, resumeId);
        return toResponse(resume);
    }

    @Transactional
    public ResumeResponse create(UUID userId, ResumeCreateRequest request) {
        Resume resume = Resume.builder()
                .userId(userId)
                .title(request.title())
                .companyName(request.companyName())
                .description(request.description())
                .build();
        resumeRepository.save(resume);

        if (request.content() != null && !request.content().isBlank()) {
            ResumeVersion v = createVersion(resume.getId(), request.content(), null);
            ragService.embedResume(userId, v.getId(), v.getContent());
        }
        return toResponse(resume);
    }

    @Transactional
    public ResumeResponse update(UUID userId, UUID resumeId, ResumeUpdateRequest request) {
        Resume resume = getOwnedResume(userId, resumeId);
        if (request.title() != null) resume.setTitle(request.title());
        if (request.companyName() != null) resume.setCompanyName(request.companyName());
        if (request.description() != null) resume.setDescription(request.description());
        return toResponse(resume);
    }

    @Transactional
    public void delete(UUID userId, UUID resumeId) {
        Resume resume = getOwnedResume(userId, resumeId);
        resumeRepository.delete(resume);
    }

    @Transactional
    public ResumeVersionResponse createVersion(UUID userId, UUID resumeId, ResumeVersionCreateRequest request) {
        getOwnedResume(userId, resumeId);
        ResumeVersion v = createVersion(resumeId, request.content(), null);
        ragService.embedResume(userId, v.getId(), v.getContent());
        return toVersionResponse(v);
    }

    @Transactional(readOnly = true)
    public List<ResumeVersionResponse> listVersions(UUID userId, UUID resumeId) {
        getOwnedResume(userId, resumeId);
        return resumeVersionRepository.findByResumeIdOrderByVersionNumberDesc(resumeId).stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumeVersionCompareResponse compareVersions(UUID userId, UUID resumeId, int versionA, int versionB) {
        getOwnedResume(userId, resumeId);
        ResumeVersion va = resumeVersionRepository.findByResumeIdAndVersionNumber(resumeId, versionA)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Version A not found"));
        ResumeVersion vb = resumeVersionRepository.findByResumeIdAndVersionNumber(resumeId, versionB)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Version B not found"));
        return new ResumeVersionCompareResponse(toVersionResponse(va), toVersionResponse(vb));
    }

    private ResumeVersion createVersion(UUID resumeId, String content, UUID parentId) {
        int nextVersion = resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resumeId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        ResumeVersion version = ResumeVersion.builder()
                .resumeId(resumeId)
                .versionNumber(nextVersion)
                .content(content)
                .parentVersionId(parentId)
                .build();
        return resumeVersionRepository.save(version);
    }

    private Resume getOwnedResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!resume.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return resume;
    }

    private ResumeResponse toResponse(Resume resume) {
        ResumeVersion latest = resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resume.getId())
                .orElse(null);
        return new ResumeResponse(
                resume.getId(),
                resume.getTitle(),
                resume.getCompanyName(),
                resume.getDescription(),
                latest != null ? latest.getVersionNumber() : null,
                latest != null ? latest.getContent() : null,
                resume.getCreatedAt(),
                resume.getUpdatedAt()
        );
    }

    private ResumeVersionResponse toVersionResponse(ResumeVersion v) {
        return new ResumeVersionResponse(
                v.getId(), v.getResumeId(), v.getVersionNumber(),
                v.getContent(), v.getMetadata(), v.getParentVersionId(), v.getCreatedAt()
        );
    }
}
