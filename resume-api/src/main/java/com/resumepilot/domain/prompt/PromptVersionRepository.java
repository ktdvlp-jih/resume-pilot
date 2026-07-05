package com.resumepilot.domain.prompt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromptVersionRepository extends JpaRepository<PromptVersion, UUID> {
    List<PromptVersion> findByPromptTemplateIdOrderByVersionNumberDesc(UUID promptTemplateId);
    Optional<PromptVersion> findTopByPromptTemplateIdOrderByVersionNumberDesc(UUID promptTemplateId);
    Optional<PromptVersion> findByPromptTemplateIdAndVersionNumber(UUID promptTemplateId, Integer versionNumber);
}
