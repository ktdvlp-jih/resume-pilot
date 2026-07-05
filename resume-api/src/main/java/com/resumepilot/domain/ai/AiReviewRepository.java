package com.resumepilot.domain.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiReviewRepository extends JpaRepository<AiReview, UUID> {
    List<AiReview> findByGenerationIdOrderByParagraphIndexAsc(UUID generationId);
}
