package com.resumepilot.application.user;

import com.resumepilot.domain.user.CareerPortfolio;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserProfile;
import com.resumepilot.domain.user.UserProfileRepository;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.user.CareerPortfolioDto;
import com.resumepilot.presentation.dto.user.UserResponse;
import com.resumepilot.presentation.dto.user.UserUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    @Transactional(readOnly = true)
    public UserResponse getMe(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        return toResponse(user, profile);
    }

    @Transactional
    public UserResponse updateMe(UUID userId, UserUpdateRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> UserProfile.builder().userId(userId).build());

        if (request.name() != null) profile.setName(request.name());
        if (request.phone() != null) profile.setPhone(request.phone());
        if (request.bio() != null) profile.setBio(request.bio());
        if (request.careerPortfolio() != null) {
            CareerPortfolio portfolio = request.careerPortfolio().toEntity();
            profile.setCareerPortfolio(portfolio);
        }
        userProfileRepository.save(profile);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return toResponse(user, profile);
    }

    private UserResponse toResponse(User user, UserProfile profile) {
        CareerPortfolioDto portfolioDto = profile != null && profile.getCareerPortfolio() != null
                ? CareerPortfolioDto.from(profile.getCareerPortfolio())
                : CareerPortfolioDto.empty();
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                profile != null ? profile.getName() : null,
                profile != null ? profile.getPhone() : null,
                profile != null ? profile.getBio() : null,
                portfolioDto,
                user.getCreatedAt()
        );
    }
}
