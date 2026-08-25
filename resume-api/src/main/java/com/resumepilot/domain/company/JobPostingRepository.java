package com.resumepilot.domain.company;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface JobPostingRepository extends JpaRepository<JobPosting, UUID> {
    List<JobPosting> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("""
            SELECT p FROM JobPosting p
            WHERE p.userId = :userId OR p.shared = true
            ORDER BY p.shared DESC, p.createdAt DESC
            """)
    List<JobPosting> findAccessibleByUserId(@Param("userId") UUID userId);

    List<JobPosting> findAllByOrderBySharedDescCreatedAtDesc();
}
