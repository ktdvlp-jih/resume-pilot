package com.resumepilot.presentation.dto.admin;

import com.resumepilot.domain.skill.SkillCatalogItem;

public record SkillCatalogAdminResponse(Long id, String name, String category) {
    public static SkillCatalogAdminResponse from(SkillCatalogItem item) {
        return new SkillCatalogAdminResponse(item.getId(), item.getName(), item.getCategory());
    }
}
