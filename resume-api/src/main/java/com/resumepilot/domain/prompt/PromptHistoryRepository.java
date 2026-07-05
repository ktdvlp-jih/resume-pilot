package com.resumepilot.domain.prompt;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PromptHistoryRepository extends JpaRepository<PromptHistory, UUID> {}
