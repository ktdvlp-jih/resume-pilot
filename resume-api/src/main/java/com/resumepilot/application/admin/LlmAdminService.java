package com.resumepilot.application.admin;

import com.resumepilot.domain.llm.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.LlmSecretsCipher;
import com.resumepilot.presentation.dto.admin.*;
import com.resumepilot.presentation.dto.internal.LlmRuntimeConfigResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LlmAdminService {

    private final LlmProviderRepository providerRepository;
    private final LlmModelRouteRepository routeRepository;
    private final LlmSecretsCipher secretsCipher;

    @Transactional(readOnly = true)
    public List<LlmProviderResponse> listProviders() {
        return providerRepository.findAllByOrderByDisplayNameAsc().stream()
                .map(this::toProviderResponse)
                .toList();
    }

    @Transactional
    public LlmProviderResponse updateProvider(UUID id, LlmProviderUpdateRequest req) {
        LlmProvider provider = getProvider(id);
        provider.setDisplayName(req.displayName());
        if (req.baseUrl() != null) {
            provider.setBaseUrl(req.baseUrl().isBlank() ? null : req.baseUrl().trim());
        }
        if (req.enabled() != null) {
            if (req.enabled() && !provider.hasApiKey()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "API key is required before enabling provider");
            }
            provider.setEnabled(req.enabled());
        }
        if (req.apiKey() != null && !req.apiKey().isBlank()) {
            provider.setApiKeyCiphertext(secretsCipher.encrypt(req.apiKey().trim()));
        }
        return toProviderResponse(providerRepository.save(provider));
    }

    @Transactional(readOnly = true)
    public List<LlmModelRouteResponse> listRoutes() {
        Map<UUID, LlmProvider> providers = providerRepository.findAll().stream()
                .collect(Collectors.toMap(LlmProvider::getId, p -> p));
        return routeRepository.findAllByOrderByOperationAscPriorityAsc().stream()
                .map(route -> toRouteResponse(route, providers.get(route.getProviderId())))
                .toList();
    }

    @Transactional
    public LlmModelRouteResponse updateRoute(LlmModelRouteUpdateRequest req) {
        LlmModelRoute route = routeRepository.findById(req.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        route.setModelName(req.modelName().trim());
        route.setPriority(req.priority());
        route.setEnabled(req.enabled());
        LlmProvider provider = getProvider(route.getProviderId());
        return toRouteResponse(routeRepository.save(route), provider);
    }

    @Transactional(readOnly = true)
    public LlmRuntimeConfigResponse getRuntimeConfig() {
        Map<UUID, LlmProvider> providers = providerRepository.findAll().stream()
                .filter(LlmProvider::isEnabled)
                .filter(LlmProvider::hasApiKey)
                .collect(Collectors.toMap(LlmProvider::getId, p -> p));

        Map<String, List<LlmRuntimeConfigResponse.LlmRuntimeRoute>> routes = new LinkedHashMap<>();
        for (LlmOperation operation : LlmOperation.values()) {
            List<LlmRuntimeConfigResponse.LlmRuntimeRoute> chain = routeRepository
                    .findByOperationOrderByPriorityAsc(operation).stream()
                    .filter(LlmModelRoute::isEnabled)
                    .map(route -> {
                        LlmProvider provider = providers.get(route.getProviderId());
                        if (provider == null) {
                            return null;
                        }
                        return new LlmRuntimeConfigResponse.LlmRuntimeRoute(
                                provider.getSlug(),
                                provider.getBaseUrl(),
                                secretsCipher.decrypt(provider.getApiKeyCiphertext()),
                                route.getModelName(),
                                route.getPriority()
                        );
                    })
                    .filter(Objects::nonNull)
                    .toList();
            routes.put(operation.name(), chain);
        }
        return new LlmRuntimeConfigResponse(routes);
    }

    private LlmProvider getProvider(UUID id) {
        return providerRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "LLM provider not found"));
    }

    private LlmProviderResponse toProviderResponse(LlmProvider provider) {
        String masked = "";
        if (provider.hasApiKey()) {
            masked = secretsCipher.maskApiKey(secretsCipher.decrypt(provider.getApiKeyCiphertext()));
        }
        return new LlmProviderResponse(
                provider.getId(),
                provider.getSlug(),
                provider.getDisplayName(),
                provider.getProviderType().name(),
                provider.getBaseUrl(),
                provider.isEnabled(),
                provider.hasApiKey(),
                masked
        );
    }

    private LlmModelRouteResponse toRouteResponse(LlmModelRoute route, LlmProvider provider) {
        return new LlmModelRouteResponse(
                route.getId(),
                route.getOperation().name(),
                route.getProviderId(),
                provider != null ? provider.getSlug() : "",
                provider != null ? provider.getDisplayName() : "",
                route.getModelName(),
                route.getPriority(),
                route.isEnabled()
        );
    }
}
