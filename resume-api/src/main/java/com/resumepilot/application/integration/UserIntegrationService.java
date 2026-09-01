package com.resumepilot.application.integration;

import com.resumepilot.domain.integration.IntegrationProvider;
import com.resumepilot.domain.integration.UserIntegration;
import com.resumepilot.domain.integration.UserIntegrationRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.LlmSecretsCipher;
import com.resumepilot.presentation.dto.integration.UserIntegrationStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserIntegrationService {

    private final UserIntegrationRepository repository;
    private final LlmSecretsCipher secretsCipher;

    @Transactional(readOnly = true)
    public List<UserIntegrationStatusResponse> listStatus(UUID userId) {
        Map<IntegrationProvider, UserIntegration> byProvider = new java.util.EnumMap<>(IntegrationProvider.class);
        for (UserIntegration row : repository.findByUserIdOrderByProviderAsc(userId)) {
            byProvider.put(row.getProvider(), row);
        }
        return Arrays.stream(IntegrationProvider.values())
                .map(p -> toStatus(p, byProvider.get(p)))
                .toList();
    }

    @Transactional
    public UserIntegrationStatusResponse saveAccessToken(UUID userId, IntegrationProvider provider, String plainToken) {
        return saveOAuthTokens(userId, provider, plainToken, null, null, Map.of());
    }

    @Transactional
    public UserIntegrationStatusResponse saveOAuthTokens(
            UUID userId,
            IntegrationProvider provider,
            String accessToken,
            String refreshToken,
            String externalUserId,
            Map<String, Object> meta) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "accessToken required");
        }
        String trimmedAccess = accessToken.trim();
        UserIntegration row = repository.findByUserIdAndProvider(userId, provider)
                .orElseGet(() -> UserIntegration.builder()
                        .userId(userId)
                        .provider(provider)
                        .metaJson(Map.of())
                        .build());
        row.setAccessTokenEnc(secretsCipher.encrypt(trimmedAccess));
        if (refreshToken != null && !refreshToken.isBlank()) {
            row.setRefreshTokenEnc(secretsCipher.encrypt(refreshToken.trim()));
        }
        if (externalUserId != null && !externalUserId.isBlank()) {
            row.setExternalUserId(externalUserId.trim());
        }
        if (meta != null && !meta.isEmpty()) {
            row.setMetaJson(meta);
        }
        repository.save(row);
        return toStatus(provider, row);
    }

    @Transactional(readOnly = true)
    public String requirePlainAccessToken(UUID userId, IntegrationProvider provider) {
        return getPlainAccessToken(userId, provider)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_INPUT,
                        provider.name() + " 연동 토큰이 없습니다. 토큰을 먼저 저장하세요."));
    }

    @Transactional(readOnly = true)
    public java.util.Optional<String> getPlainAccessToken(UUID userId, IntegrationProvider provider) {
        return repository.findByUserIdAndProvider(userId, provider)
                .map(UserIntegration::getAccessTokenEnc)
                .filter(enc -> enc != null && !enc.isBlank())
                .map(secretsCipher::decrypt)
                .filter(plain -> plain != null && !plain.isBlank());
    }

    private UserIntegrationStatusResponse toStatus(IntegrationProvider provider, UserIntegration row) {
        if (row == null || row.getAccessTokenEnc() == null || row.getAccessTokenEnc().isBlank()) {
            return new UserIntegrationStatusResponse(provider.name(), false, "", null);
        }
        String plain = secretsCipher.decrypt(row.getAccessTokenEnc());
        String masked = secretsCipher.maskApiKey(plain);
        return new UserIntegrationStatusResponse(
                provider.name(),
                plain != null && !plain.isBlank(),
                masked == null ? "" : masked,
                row.getExternalUserId()
        );
    }
}
