package com.resumepilot.domain.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "ai_generations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiGeneration {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "resume_id") private UUID resumeId;
    @Column(name = "job_posting_id") private UUID jobPostingId;
    @Column(name = "rewrite_level") @Builder.Default private Integer rewriteLevel = 40;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "input_context") @Builder.Default private Map<String, Object> inputContext = Map.of();
    @Column(name = "output_content", columnDefinition = "TEXT") private String outputContent;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "quality_scores") @Builder.Default private Map<String, Object> qualityScores = Map.of();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "experience_ids") @Builder.Default private List<String> experienceIds = List.of();
    @Builder.Default private String status = "COMPLETED";
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
