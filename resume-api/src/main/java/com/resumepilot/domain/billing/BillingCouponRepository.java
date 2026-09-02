package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface BillingCouponRepository extends JpaRepository<BillingCoupon, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BillingCoupon> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
