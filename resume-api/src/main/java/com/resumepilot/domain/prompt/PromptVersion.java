package com.resumepilot.domain.prompt;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "prompt_versions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromptVersion {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "prompt_template_id", nullable = false) private UUID promptTemplateId;
    @Column(name = "version_number", nullable = false) private Integer versionNumber;
    @Column(name = "system_prompt", nullable = false, columnDefinition = "TEXT") private String systemPrompt;
    @Column(name = "persona_prompt", nullable = false, columnDefinition = "TEXT") @Builder.Default private String personaPrompt = "";
    @Column(name = "guard_prompt", nullable = false, columnDefinition = "TEXT") @Builder.Default private String guardPrompt = "";
    @Column(name = "task_prompt", nullable = false, columnDefinition = "TEXT") @Builder.Default private String taskPrompt = "";
    @Column(name = "output_prompt", nullable = false, columnDefinition = "TEXT") @Builder.Default private String outputPrompt = "";
    @Column(name = "user_prompt", nullable = false, columnDefinition = "TEXT") private String userPrompt;
    @JdbcTypeCode(SqlTypes.JSON) @Builder.Default private List<String> variables = List.of();
    @Column(name = "is_active", nullable = false) @Builder.Default private boolean active = false;
    @Column(name = "created_by") private UUID createdBy;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
}
