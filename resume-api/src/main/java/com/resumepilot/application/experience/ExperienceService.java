package com.resumepilot.application.experience;

import com.resumepilot.application.mapper.ExperienceMapper;
import com.resumepilot.application.rag.RagService;
import com.resumepilot.domain.experience.Experience;
import com.resumepilot.domain.experience.ExperienceRepository;
import com.resumepilot.domain.experience.ExperienceType;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.persistence.ExperienceQueryRepository;
import com.resumepilot.presentation.dto.experience.ExperienceCreateRequest;
import com.resumepilot.presentation.dto.experience.ExperienceResponse;
import com.resumepilot.presentation.dto.experience.ExperienceUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final ExperienceQueryRepository experienceQueryRepository;
    private final ExperienceMapper experienceMapper;
    private final RagService ragService;

    @Transactional(readOnly = true)
    public List<ExperienceResponse> list(UUID userId, ExperienceType type) {
        return experienceQueryRepository.findByUserIdWithOptionalType(userId, type).stream()
                .map(experienceMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExperienceResponse get(UUID userId, UUID id) {
        return experienceMapper.toResponse(getOwned(userId, id));
    }

    @Transactional
    public ExperienceResponse create(UUID userId, ExperienceCreateRequest request) {
        Experience experience = mapCreate(userId, request);
        experienceRepository.save(experience);
        ragService.embedExperience(userId, experience);
        return experienceMapper.toResponse(experience);
    }

    @Transactional
    public ExperienceResponse update(UUID userId, UUID id, ExperienceUpdateRequest request) {
        Experience experience = getOwned(userId, id);
        applyUpdate(experience, request);
        ragService.embedExperience(userId, experience);
        return experienceMapper.toResponse(experience);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        experienceRepository.delete(getOwned(userId, id));
    }

    @Transactional
    public void embed(UUID userId, UUID id) {
        ragService.embedExperience(userId, getOwned(userId, id));
    }

    private Experience getOwned(UUID userId, UUID id) {
        Experience experience = experienceRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!experience.getUserId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return experience;
    }

    private Experience mapCreate(UUID userId, ExperienceCreateRequest req) {
        return Experience.builder()
                .userId(userId)
                .type(req.type())
                .title(req.title())
                .description(req.description())
                .role(req.role())
                .contribution(req.contribution())
                .result(req.result())
                .numericResult(req.numericResult())
                .starSituation(req.starSituation())
                .starTask(req.starTask())
                .starAction(req.starAction())
                .starResult(req.starResult())
                .skills(req.skills() != null ? req.skills() : List.of())
                .startDate(req.startDate())
                .endDate(req.endDate())
                .build();
    }

    private void applyUpdate(Experience e, ExperienceUpdateRequest req) {
        if (req.type() != null) e.setType(req.type());
        if (req.title() != null) e.setTitle(req.title());
        if (req.description() != null) e.setDescription(req.description());
        if (req.role() != null) e.setRole(req.role());
        if (req.contribution() != null) e.setContribution(req.contribution());
        if (req.result() != null) e.setResult(req.result());
        if (req.numericResult() != null) e.setNumericResult(req.numericResult());
        if (req.starSituation() != null) e.setStarSituation(req.starSituation());
        if (req.starTask() != null) e.setStarTask(req.starTask());
        if (req.starAction() != null) e.setStarAction(req.starAction());
        if (req.starResult() != null) e.setStarResult(req.starResult());
        if (req.skills() != null) e.setSkills(req.skills());
        if (req.startDate() != null) e.setStartDate(req.startDate());
        if (req.endDate() != null) e.setEndDate(req.endDate());
    }
}
