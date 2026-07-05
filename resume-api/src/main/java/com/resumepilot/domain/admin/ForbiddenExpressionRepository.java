package com.resumepilot.domain.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ForbiddenExpressionRepository extends JpaRepository<ForbiddenExpression, UUID> {
    List<ForbiddenExpression> findByEnabledTrue();
}
