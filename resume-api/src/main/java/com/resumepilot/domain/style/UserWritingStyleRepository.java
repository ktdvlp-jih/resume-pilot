package com.resumepilot.domain.style;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserWritingStyleRepository extends JpaRepository<UserWritingStyle, UUID> {
    Optional<UserWritingStyle> findTopByUserIdOrderByUpdatedAtDesc(UUID userId);
}
