package com.resumepilot.domain.billing;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "integration_configs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IntegrationConfig {

    @Id
    @Column(length = 100)
    private String key;

    @Column(name = "value_ciphertext", columnDefinition = "TEXT")
    private String valueCiphertext;

    @Column(name = "is_secret", nullable = false)
    @Builder.Default
    private boolean secret = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
