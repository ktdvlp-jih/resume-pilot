package com.resumepilot.domain.company;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JobPostingRepository extends JpaRepository<JobPosting, UUID> {
    List<JobPosting> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
