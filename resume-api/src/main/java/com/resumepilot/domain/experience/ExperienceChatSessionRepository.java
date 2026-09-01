package com.resumepilot.domain.experience;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExperienceChatSessionRepository extends JpaRepository<ExperienceChatSession, UUID> {
    List<ExperienceChatSession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}
