package com.resumepilot.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserIntegrationRepository extends JpaRepository<UserIntegration, UUID> {
    Optional<UserIntegration> findByUserIdAndProvider(UUID userId, IntegrationProvider provider);

    List<UserIntegration> findByUserIdOrderByProviderAsc(UUID userId);
}
