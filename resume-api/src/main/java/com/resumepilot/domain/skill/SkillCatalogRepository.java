package com.resumepilot.domain.skill;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillCatalogRepository extends JpaRepository<SkillCatalogItem, Long> {
    List<SkillCatalogItem> findAllByOrderByCategoryAscNameAsc();
}
