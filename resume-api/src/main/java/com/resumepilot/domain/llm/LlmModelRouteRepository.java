package com.resumepilot.domain.llm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LlmModelRouteRepository extends JpaRepository<LlmModelRoute, UUID> {
    List<LlmModelRoute> findByOperationOrderByPriorityAsc(LlmOperation operation);
    List<LlmModelRoute> findAllByOrderByOperationAscPriorityAsc();
}
