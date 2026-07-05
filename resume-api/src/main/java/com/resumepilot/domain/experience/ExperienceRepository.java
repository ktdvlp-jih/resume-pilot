package com.resumepilot.domain.experience;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExperienceRepository extends JpaRepository<Experience, UUID> {
    List<Experience> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    List<Experience> findByUserIdAndTypeOrderByUpdatedAtDesc(UUID userId, ExperienceType type);
}
