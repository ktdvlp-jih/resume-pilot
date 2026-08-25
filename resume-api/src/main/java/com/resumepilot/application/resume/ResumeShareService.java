package com.resumepilot.application.resume;

import com.resumepilot.domain.resume.Resume;
import com.resumepilot.domain.resume.ResumeRepository;
import com.resumepilot.domain.resume.ResumeShareLink;
import com.resumepilot.domain.resume.ResumeShareLinkRepository;
import com.resumepilot.domain.resume.ResumeVersion;
import com.resumepilot.domain.resume.ResumeVersionRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.resume.PublicSharedResumeResponse;
import com.resumepilot.presentation.dto.resume.ResumeShareLinkResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResumeShareService {

    private static final int TOKEN_BYTES = 24;
    private static final int LINK_DAYS = 7;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ResumeRepository resumeRepository;
    private final ResumeVersionRepository resumeVersionRepository;
    private final ResumeShareLinkRepository shareLinkRepository;

    @Transactional
    public ResumeShareLinkResponse create(UUID userId, UUID resumeId) {
        Resume resume = getOwnedResume(userId, resumeId);
        ResumeVersion latest = resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resume.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT, "No content to share"));
        if (latest.getContent() == null || latest.getContent().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "No content to share");
        }
        shareLinkRepository.deleteByResumeId(resumeId);
        shareLinkRepository.flush();
        Instant expiresAt = Instant.now().plus(LINK_DAYS, ChronoUnit.DAYS);
        ResumeShareLink link = ResumeShareLink.builder()
                .resumeId(resumeId)
                .token(newToken())
                .expiresAt(expiresAt)
                .build();
        shareLinkRepository.save(link);
        return toResponse(link);
    }

    @Transactional(readOnly = true)
    public ResumeShareLinkResponse getOwned(UUID userId, UUID resumeId) {
        getOwnedResume(userId, resumeId);
        ResumeShareLink link = shareLinkRepository.findByResumeId(resumeId)
                .filter(this::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return toResponse(link);
    }

    @Transactional
    public void revoke(UUID userId, UUID resumeId) {
        getOwnedResume(userId, resumeId);
        shareLinkRepository.deleteByResumeId(resumeId);
    }

    @Transactional(readOnly = true)
    public PublicSharedResumeResponse getPublic(String token) {
        ResumeShareLink link = shareLinkRepository.findByToken(token)
                .filter(this::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Resume resume = resumeRepository.findById(link.getResumeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        ResumeVersion latest = resumeVersionRepository.findTopByResumeIdOrderByVersionNumberDesc(resume.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return new PublicSharedResumeResponse(
                resume.getTitle(),
                resume.getCompanyName(),
                latest.getContent(),
                link.getExpiresAt()
        );
    }

    private boolean isActive(ResumeShareLink link) {
        return link.getExpiresAt() != null && link.getExpiresAt().isAfter(Instant.now());
    }

    private Resume getOwnedResume(UUID userId, UUID resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!resume.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return resume;
    }

    private static ResumeShareLinkResponse toResponse(ResumeShareLink link) {
        return new ResumeShareLinkResponse(link.getToken(), "/r/" + link.getToken(), link.getExpiresAt());
    }

    private static String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
