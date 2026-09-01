package com.resumepilot.domain.experience;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "experience_chat_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExperienceChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 200)
    @Builder.Default
    private String title = "새 경험";

    @Column(name = "target_experience_id")
    private UUID targetExperienceId;

    @Column(name = "applied_experience_id")
    private UUID appliedExperienceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExperienceChatSessionStatus status = ExperienceChatSessionStatus.ACTIVE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "latest_draft", nullable = false)
    @Builder.Default
    private Map<String, Object> latestDraft = Map.of();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
