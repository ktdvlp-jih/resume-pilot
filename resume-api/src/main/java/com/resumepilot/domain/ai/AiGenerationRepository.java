package com.resumepilot.domain.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AiGenerationRepository extends JpaRepository<AiGeneration, UUID> {
    List<AiGeneration> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
    List<AiGeneration> findTop50ByOrderByCreatedAtDesc();
}
