package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, UUID> {
    Optional<PaymentOrder> findByOrderId(String orderId);

    @Query("SELECT o FROM PaymentOrder o WHERE o.orderId = :orderId AND o.userId = :userId")
    Optional<PaymentOrder> findByOrderIdAndUserId(@Param("orderId") String orderId, @Param("userId") UUID userId);
}
