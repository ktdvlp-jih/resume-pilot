package com.resumepilot.domain.billing;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "billing_coupons")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingCoupon {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BillingProductKind kind;

    @Column(length = 50)
    private String operation;

    @Column(name = "grant_amount", nullable = false)
    private int grantAmount;

    @Column(name = "max_redemptions", nullable = false)
    @Builder.Default
    private int maxRedemptions = 1;

    @Column(name = "redemption_count", nullable = false)
    @Builder.Default
    private int redemptionCount = 0;

    @Column(name = "valid_from", nullable = false)
    @Builder.Default
    private Instant validFrom = Instant.now();

    @Column(name = "valid_until")
    private Instant validUntil;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(length = 500)
    private String note;

    @Column(name = "created_by_admin_id")
    private UUID createdByAdminId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
