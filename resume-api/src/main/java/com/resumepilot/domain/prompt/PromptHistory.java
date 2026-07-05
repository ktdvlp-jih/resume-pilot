package com.resumepilot.domain.prompt;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "prompt_histories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromptHistory {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "prompt_version_id", nullable = false) private UUID promptVersionId;
    @Column(nullable = false) private String action;
    @Column(name = "changed_by") private UUID changedBy;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private Map<String, Object> changeDetail = Map.of();
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
