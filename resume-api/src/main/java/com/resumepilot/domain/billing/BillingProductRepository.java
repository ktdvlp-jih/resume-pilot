package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BillingProductRepository extends JpaRepository<BillingProduct, UUID> {
    List<BillingProduct> findByEnabledTrueOrderBySortOrderAsc();
    List<BillingProduct> findAllByOrderBySortOrderAsc();
}
