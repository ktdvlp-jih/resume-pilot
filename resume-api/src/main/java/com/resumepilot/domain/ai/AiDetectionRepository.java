package com.resumepilot.domain.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiDetectionRepository extends JpaRepository<AiDetection, UUID> {
    List<AiDetection> findByGenerationIdOrderBySentenceIndexAsc(UUID generationId);
}
