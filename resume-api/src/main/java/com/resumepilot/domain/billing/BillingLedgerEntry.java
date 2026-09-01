package com.resumepilot.domain.billing;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "billing_ledger")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillingLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 30)
    private BillingLedgerEntryType entryType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BillingProductKind kind;

    @Column(length = 50)
    private String operation;

    @Column(nullable = false)
    private int amount;

    @Column(name = "lot_id")
    private UUID lotId;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "needs_manual_fix", nullable = false)
    @Builder.Default
    private boolean needsManualFix = false;

    @Column(length = 500)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
