package com.resumepilot.domain.guest;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guest_trial_uses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuestTrialUse {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(name = "guest_id", nullable = false, length = 64)
    private String guestId;

    @Column(nullable = false, length = 40)
    private String operation;

    @Column(name = "used_at", nullable = false, updatable = false)
    private Instant usedAt;

    @PrePersist
    void prePersist() {
        if (usedAt == null) usedAt = Instant.now();
    }
}
