package com.resumepilot.domain.prompt;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "prompt_templates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PromptTemplate {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, unique = true) private String type;
    @Column(nullable = false) private String name;
    private String description;
    @Column(name = "active_version_id") private UUID activeVersionId;
    @CreationTimestamp @Column(name = "created_at", updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(name = "updated_at") private Instant updatedAt;
}
