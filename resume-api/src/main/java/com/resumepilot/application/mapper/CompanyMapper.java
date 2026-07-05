package com.resumepilot.application.mapper;

import com.resumepilot.domain.company.Company;
import com.resumepilot.presentation.dto.job.CompanyResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CompanyMapper {
    CompanyResponse toResponse(Company company);
}
