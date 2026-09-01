package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillingOperationCostRepository extends JpaRepository<BillingOperationCost, String> {
    List<BillingOperationCost> findAllByOrderByOperationAsc();
}
