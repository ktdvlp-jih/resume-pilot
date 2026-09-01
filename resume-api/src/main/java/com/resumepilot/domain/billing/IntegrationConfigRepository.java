package com.resumepilot.domain.billing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IntegrationConfigRepository extends JpaRepository<IntegrationConfig, String> {
    List<IntegrationConfig> findAllByOrderByKeyAsc();
}
