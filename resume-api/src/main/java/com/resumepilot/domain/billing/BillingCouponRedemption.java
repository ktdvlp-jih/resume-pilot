package com.resumepilot.domain.billing;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "billing_coupon_redemptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingCouponRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "coupon_id", nullable = false)
    private UUID couponId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "ledger_id", nullable = false)
    private UUID ledgerId;

    @CreationTimestamp
    @Column(name = "redeemed_at", updatable = false)
    private Instant redeemedAt;
}
