package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FreeAllowanceGrantRepository extends JpaRepository<FreeAllowanceGrant, UUID> {

    boolean existsByUserIdAndPeriodKey(UUID userId, String periodKey);
}
