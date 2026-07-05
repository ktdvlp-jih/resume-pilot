package com.resumepilot.domain.style;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "user_writing_styles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWritingStyle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "frequent_words")
    @Builder.Default
    private List<String> frequentWords = List.of();

    @Column(name = "avg_sentence_length")
    private BigDecimal avgSentenceLength;

    @Column(name = "uses_formal_speech")
    @Builder.Default
    private Boolean usesFormalSpeech = true;

    @Column(name = "sentence_style")
    private String sentenceStyle;

    @Column(name = "expression_style", columnDefinition = "TEXT")
    private String expressionStyle;

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<String> connectors = List.of();

    private String tone;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_json")
    @Builder.Default
    private Map<String, Object> analysisJson = Map.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_resume_ids")
    @Builder.Default
    private List<String> sourceResumeIds = List.of();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
