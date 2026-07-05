package com.resumepilot.application.mapper;

import com.resumepilot.domain.experience.Experience;
import com.resumepilot.presentation.dto.experience.ExperienceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ExperienceMapper {
    ExperienceResponse toResponse(Experience experience);
}
