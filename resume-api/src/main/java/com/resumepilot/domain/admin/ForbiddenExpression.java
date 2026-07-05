package com.resumepilot.domain.admin;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "forbidden_expressions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ForbiddenExpression {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, unique = true)
    private String expression;
    private String suggestion;
    @Builder.Default private String severity = "WARNING";
    @Builder.Default private boolean enabled = true;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
