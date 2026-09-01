package com.resumepilot.domain.billing;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByOrderId(String orderId);
    List<Payment> findAllByOrderByCreatedAtDesc();
    List<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Payment> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
