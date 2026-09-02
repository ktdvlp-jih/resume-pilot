package com.resumepilot.domain.billing;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.UUID;

public interface BillingLedgerRepository extends JpaRepository<BillingLedgerEntry, UUID> {

    Page<BillingLedgerEntry> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("""
            SELECT e FROM BillingLedgerEntry e
            WHERE e.userId = :userId
              AND e.entryType IN :types
            ORDER BY e.createdAt DESC
            """)
    Page<BillingLedgerEntry> findByUserIdAndEntryTypeInOrderByCreatedAtDesc(
            @Param("userId") UUID userId,
            @Param("types") Collection<BillingLedgerEntryType> types,
            Pageable pageable);
}
