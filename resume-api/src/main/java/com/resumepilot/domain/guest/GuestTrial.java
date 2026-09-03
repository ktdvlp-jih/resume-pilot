package com.resumepilot.domain.guest;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guest_trials")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuestTrial {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "guest_id", nullable = false, unique = true, length = 64)
    private String guestId;

    @Column(length = 64)
    private String ip;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean converted;

    @Column(name = "user_id")
    private UUID userId;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
