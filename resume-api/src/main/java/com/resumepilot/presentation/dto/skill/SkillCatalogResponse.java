package com.resumepilot.presentation.dto.skill;

import com.resumepilot.domain.skill.SkillCatalogItem;

public record SkillCatalogResponse(String name, String category) {
    public static SkillCatalogResponse from(SkillCatalogItem item) {
        return new SkillCatalogResponse(item.getName(), item.getCategory());
    }
}
