package com.resumepilot.presentation.controller;

import com.resumepilot.domain.skill.SkillCatalogRepository;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.skill.SkillCatalogResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/skill-catalog")
@RequiredArgsConstructor
@Tag(name = "SkillCatalog")
public class SkillCatalogController {

    private final SkillCatalogRepository skillCatalogRepository;

    @GetMapping
    @Operation(summary = "스킬 카탈로그 목록")
    public ApiResponse<List<SkillCatalogResponse>> list() {
        return ApiResponse.ok(skillCatalogRepository.findAllByOrderByCategoryAscNameAsc().stream()
                .map(SkillCatalogResponse::from)
                .toList());
    }
}
