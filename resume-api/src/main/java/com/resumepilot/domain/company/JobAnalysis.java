package com.resumepilot.domain.company;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "job_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "job_posting_id", nullable = false)
    private UUID jobPostingId;

    @Column(name = "company_name")
    private String companyName;

    private String position;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_skills")
    @Builder.Default
    private List<String> requiredSkills = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_skills")
    @Builder.Default
    private List<String> preferredSkills = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "talent_profile")
    @Builder.Default
    private List<String> talentProfile = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "core_competencies")
    @Builder.Default
    private List<String> coreCompetencies = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tech_keywords")
    @Builder.Default
    private List<String> techKeywords = List.of();

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "org_culture", columnDefinition = "TEXT")
    private String orgCulture;

    @Column(name = "fit_score")
    private BigDecimal fitScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_json")
    @Builder.Default
    private Map<String, Object> analysisJson = Map.of();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
