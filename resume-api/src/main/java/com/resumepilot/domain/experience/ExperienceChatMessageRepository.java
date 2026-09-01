package com.resumepilot.domain.experience;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExperienceChatMessageRepository extends JpaRepository<ExperienceChatMessage, UUID> {
    List<ExperienceChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);
}
