package com.resumepilot.domain.admin;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "ai_usage_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiUsageLog {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "user_id") private UUID userId;
    @Column(nullable = false) private String service;
    @Column(nullable = false) private String operation;
    private String model;
    @Column(name = "input_tokens") @Builder.Default private Integer inputTokens = 0;
    @Column(name = "output_tokens") @Builder.Default private Integer outputTokens = 0;
    @Column(name = "duration_ms") private Integer durationMs;
    @Builder.Default private String status = "SUCCESS";
    @Column(name = "error_message") private String errorMessage;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private Map<String, Object> metadata = Map.of();
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
