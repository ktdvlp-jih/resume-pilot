package com.resumepilot.application.resume;

import com.resumepilot.application.job.JobPostingService;
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

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final ResumeVersionRepository resumeVersionRepository;
    private final RagService ragService;
    private final JobPostingService jobPostingService;

    @Transactional(readOnly = true)
    public List<ResumeResponse> list(UUID userId, UUID jobPostingId) {
        List<Resume> resumes = jobPostingId != null
                ? resumeRepository.findByUserIdAndJobPostingIdOrderByUpdatedAtDesc(userId, jobPostingId)
                : resumeRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return resumes.stream()
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
        if (request.jobPostingId() != null) {
            jobPostingService.assertAccessible(userId, request.jobPostingId());
            List<Resume> existing = resumeRepository
                    .findByUserIdAndJobPostingIdOrderByUpdatedAtDesc(userId, request.jobPostingId());
            if (!existing.isEmpty()) {
                Resume resume = existing.get(0);
                if (request.title() != null && !request.title().isBlank()) {
                    resume.setTitle(request.title());
                }
                if (request.companyName() != null && !request.companyName().isBlank()) {
                    resume.setCompanyName(request.companyName());
                }
                if (request.description() != null) {
                    resume.setDescription(request.description());
                }
                if (request.content() != null && !request.content().isBlank()) {
                    ResumeVersion v = createVersion(resume.getId(), request.content(), null, request.title());
                    ragService.embedResume(userId, v.getId(), v.getContent());
                }
                return toResponse(resume);
            }
        }

        Resume resume = Resume.builder()
                .userId(userId)
                .title(request.title())
                .companyName(request.companyName())
                .description(request.description())
                .jobPostingId(request.jobPostingId())
                .build();
        resumeRepository.save(resume);

        if (request.content() != null && !request.content().isBlank()) {
            ResumeVersion v = createVersion(resume.getId(), request.content(), null, request.title());
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
        Resume resume = getOwnedResume(userId, resumeId);
        String name = trimName(request.name());
        if (name != null) {
            resume.setTitle(name);
        }
        ResumeVersion v = createVersion(resumeId, request.content(), null, name);
        resume.setUpdatedAt(Instant.now());
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

    private ResumeVersion createVersion(UUID resumeId, String content, UUID parentId, String name) {
        int nextVersion = resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resumeId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        String trimmed = trimName(name);
        Map<String, Object> metadata = new HashMap<>();
        if (trimmed != null) {
            metadata.put("name", trimmed);
        }
        ResumeVersion version = ResumeVersion.builder()
                .resumeId(resumeId)
                .versionNumber(nextVersion)
                .content(content)
                .metadata(metadata)
                .parentVersionId(parentId)
                .build();
        return resumeVersionRepository.save(version);
    }

    private static String trimName(String name) {
        if (name == null) return null;
        String trimmed = name.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > 80 ? trimmed.substring(0, 80) : trimmed;
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
                resume.getJobPostingId(),
                latest != null ? latest.getVersionNumber() : null,
                latest != null ? latest.getContent() : null,
                resume.getCreatedAt(),
                resume.getUpdatedAt()
        );
    }

    private ResumeVersionResponse toVersionResponse(ResumeVersion v) {
        Map<String, Object> metadata = v.getMetadata() != null ? v.getMetadata() : Map.of();
        Object rawName = metadata.get("name");
        String name = rawName instanceof String s && !s.isBlank() ? s.trim() : null;
        return new ResumeVersionResponse(
                v.getId(), v.getResumeId(), v.getVersionNumber(),
                v.getContent(), metadata, v.getParentVersionId(), v.getCreatedAt(),
                name
        );
    }
}
