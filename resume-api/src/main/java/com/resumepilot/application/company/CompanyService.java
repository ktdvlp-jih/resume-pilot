package com.resumepilot.application.company;

import com.resumepilot.application.mapper.CompanyMapper;
import com.resumepilot.domain.company.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;

    @Transactional(readOnly = true)
    public List<CompanyResponse> list() {
        return companyRepository.findAll().stream().map(companyMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CompanyResponse get(UUID id) {
        return companyMapper.toResponse(companyRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND)));
    }

    @Transactional
    public Company upsertFromAnalysis(Map<String, Object> analysis) {
        String name = (String) analysis.getOrDefault("company_name", "Unknown");
        if (name == null || name.isBlank()) {
            return null;
        }
        Company company = companyRepository.findByName(name).orElseGet(() ->
                Company.builder().name(name).build());

        applyAnalysis(company, analysis);
        return companyRepository.save(company);
    }

    private void applyAnalysis(Company company, Map<String, Object> analysis) {
        if (analysis.get("core_values") instanceof List<?> cv) {
            company.setCoreValues(cv.stream().map(String::valueOf).toList());
        }
        if (analysis.get("talent_profile") instanceof List<?> tp) {
            company.setTalentProfile(tp.stream().map(String::valueOf).toList());
        }
        if (analysis.get("tech_keywords") instanceof List<?> tk) {
            company.setTechStack(tk.stream().map(String::valueOf).toList());
            company.setHiringKeywords(tk.stream().map(String::valueOf).toList());
        }
        if (analysis.get("org_culture") != null) {
            company.setCulture(String.valueOf(analysis.get("org_culture")));
        }
    }
}
