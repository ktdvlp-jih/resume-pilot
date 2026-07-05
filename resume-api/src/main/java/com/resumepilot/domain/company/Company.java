package com.resumepilot.domain.company;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "companies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<String> coreValues = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "talent_profile")
    @Builder.Default
    private List<String> talentProfile = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tech_stack")
    @Builder.Default
    private List<String> techStack = List.of();

    private String culture;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "hiring_keywords")
    @Builder.Default
    private List<String> hiringKeywords = List.of();

    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, Object> metadata = Map.of();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
