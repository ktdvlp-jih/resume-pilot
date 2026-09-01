package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingLedgerRepository extends JpaRepository<BillingLedgerEntry, UUID> {
}
