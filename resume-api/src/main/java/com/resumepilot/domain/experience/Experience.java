package com.resumepilot.domain.experience;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "experiences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Experience {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExperienceType type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String role;
    private String contribution;

    @Column(columnDefinition = "TEXT")
    private String result;

    @Column(name = "numeric_result")
    private String numericResult;

    @Column(name = "star_situation", columnDefinition = "TEXT")
    private String starSituation;

    @Column(name = "star_task", columnDefinition = "TEXT")
    private String starTask;

    @Column(name = "star_action", columnDefinition = "TEXT")
    private String starAction;

    @Column(name = "star_result", columnDefinition = "TEXT")
    private String starResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<String> skills = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, Object> metadata = Map.of();

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
