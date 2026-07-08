package com.resumepilot.domain.llm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LlmProviderRepository extends JpaRepository<LlmProvider, UUID> {
    Optional<LlmProvider> findBySlug(String slug);
    List<LlmProvider> findAllByOrderByDisplayNameAsc();
}
