package com.resumepilot.domain.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobAnalysisRepository extends JpaRepository<JobAnalysis, UUID> {
    Optional<JobAnalysis> findTopByJobPostingIdOrderByCreatedAtDesc(UUID jobPostingId);
    List<JobAnalysis> findByJobPostingIdOrderByCreatedAtDesc(UUID jobPostingId);
}
