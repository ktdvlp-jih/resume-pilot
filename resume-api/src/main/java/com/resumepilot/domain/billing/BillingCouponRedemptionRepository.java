package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BillingCouponRedemptionRepository extends JpaRepository<BillingCouponRedemption, UUID> {

    boolean existsByCouponIdAndUserId(UUID couponId, UUID userId);
}
