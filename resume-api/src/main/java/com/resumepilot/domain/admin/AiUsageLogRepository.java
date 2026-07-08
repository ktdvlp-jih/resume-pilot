package com.resumepilot.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AiUsageLogRepository extends JpaRepository<AiUsageLog, UUID> {
    List<AiUsageLog> findTop50ByOrderByCreatedAtDesc();

    @Query(value = """
            SELECT id,
                   user_id AS userId,
                   service,
                   operation,
                   model,
                   duration_ms AS durationMs,
                   status,
                   created_at AS createdAt
            FROM ai_usage_logs
            ORDER BY created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<AiLogListRow> findRecentRows(@Param("limit") int limit);

    interface AiLogListRow {
        UUID getId();
        UUID getUserId();
        String getService();
        String getOperation();
        String getModel();
        Integer getDurationMs();
        String getStatus();
        Instant getCreatedAt();
    }
}
