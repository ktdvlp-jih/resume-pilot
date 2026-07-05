package com.resumepilot.presentation.controller;

import com.resumepilot.application.company.CompanyService;
import com.resumepilot.global.response.ApiResponse;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
@Tag(name = "Company")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    @Operation(summary = "기업 목록")
    public ApiResponse<List<CompanyResponse>> list() {
        return ApiResponse.ok(companyService.list());
    }

    @GetMapping("/{id}")
    @Operation(summary = "기업 상세")
    public ApiResponse<CompanyResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(companyService.get(id));
    }
}
