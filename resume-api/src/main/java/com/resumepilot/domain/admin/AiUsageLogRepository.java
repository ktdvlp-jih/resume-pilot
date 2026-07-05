package com.resumepilot.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {
    List<AiUsageLog> findTop50ByOrderByCreatedAtDesc();
}
