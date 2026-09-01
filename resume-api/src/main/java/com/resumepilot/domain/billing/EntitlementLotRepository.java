package com.resumepilot.domain.billing;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface EntitlementLotRepository extends JpaRepository<EntitlementLot, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT l FROM EntitlementLot l
            WHERE l.userId = :userId AND l.kind = :kind
              AND ((:operation IS NULL AND l.operation IS NULL) OR l.operation = :operation)
              AND l.remaining > 0
              AND (l.expiresAt IS NULL OR l.expiresAt > :now)
            ORDER BY l.createdAt ASC
            """)
    List<EntitlementLot> findAvailableForUpdate(
            @Param("userId") UUID userId,
            @Param("kind") BillingProductKind kind,
            @Param("operation") String operation,
            @Param("now") Instant now);

    List<EntitlementLot> findByPaymentIdAndRemainingGreaterThan(UUID paymentId, int remaining);

    @Query("""
            SELECT COALESCE(SUM(l.remaining), 0) FROM EntitlementLot l
            WHERE l.userId = :userId AND l.kind = com.resumepilot.domain.billing.BillingProductKind.TOKEN
              AND l.remaining > 0
              AND (l.expiresAt IS NULL OR l.expiresAt > :now)
            """)
    long sumTokenRemaining(@Param("userId") UUID userId, @Param("now") Instant now);

    @Query("""
            SELECT l.operation, COALESCE(SUM(l.remaining), 0) FROM EntitlementLot l
            WHERE l.userId = :userId AND l.kind = com.resumepilot.domain.billing.BillingProductKind.COUNT
              AND l.remaining > 0
              AND (l.expiresAt IS NULL OR l.expiresAt > :now)
            GROUP BY l.operation
            """)
    List<Object[]> sumCountRemainingByOperation(@Param("userId") UUID userId, @Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT l FROM EntitlementLot l
            WHERE l.userId = :userId AND l.source = com.resumepilot.domain.billing.EntitlementSource.FREE_MONTHLY
              AND l.remaining > 0
            """)
    List<EntitlementLot> findActiveFreeLotsForUpdate(@Param("userId") UUID userId);

    @Modifying
    @Query("""
            UPDATE EntitlementLot l SET l.remaining = 0
            WHERE l.source = com.resumepilot.domain.billing.EntitlementSource.FREE_MONTHLY
              AND l.remaining > 0 AND l.expiresAt IS NOT NULL AND l.expiresAt <= :now
            """)
    int expireFreeLots(@Param("now") Instant now);
}
