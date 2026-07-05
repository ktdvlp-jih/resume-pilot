package com.resumepilot.domain.ai;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_detections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiDetection {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "generation_id") private UUID generationId;
    @Column(name = "sentence_index", nullable = false) private Integer sentenceIndex;
    @Column(nullable = false, columnDefinition = "TEXT") private String sentence;
    @Column(nullable = false) private String level;
    private String reason;
    private String suggestion;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
