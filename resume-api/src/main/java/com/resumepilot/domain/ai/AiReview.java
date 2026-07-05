package com.resumepilot.domain.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "ai_reviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiReview {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "generation_id") private UUID generationId;
    @Column(name = "paragraph_index", nullable = false) private Integer paragraphIndex;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private List<String> strengths = List.of();
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private List<String> weaknesses = List.of();
    @Column(name = "company_fit") private String companyFit;
    private String specificity;
    private String persuasiveness;
    @Column(name = "star_applied") @Builder.Default private Boolean starApplied = false;
    private String improvement;
    private String suggestion;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
