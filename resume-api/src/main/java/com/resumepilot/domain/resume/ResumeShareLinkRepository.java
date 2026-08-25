package com.resumepilot.domain.resume;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ResumeShareLinkRepository extends JpaRepository<ResumeShareLink, UUID> {
    Optional<ResumeShareLink> findByToken(String token);

    Optional<ResumeShareLink> findByResumeId(UUID resumeId);

    void deleteByResumeId(UUID resumeId);
}
