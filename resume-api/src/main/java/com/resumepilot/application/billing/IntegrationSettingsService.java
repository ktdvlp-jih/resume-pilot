package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.IntegrationConfig;
import com.resumepilot.domain.billing.IntegrationConfigRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.LlmSecretsCipher;
import com.resumepilot.presentation.dto.billing.IntegrationSettingItemResponse;
import com.resumepilot.presentation.dto.billing.IntegrationSettingRevealResponse;
import com.resumepilot.presentation.dto.billing.IntegrationSettingsUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IntegrationSettingsService {

    public static final String TOSS_CLIENT_KEY = "TOSS_PAYMENTS_CLIENT_KEY";
    public static final String TOSS_SECRET_KEY = "TOSS_PAYMENTS_SECRET_KEY";
    public static final String NOTION_CLIENT_ID = "NOTION_CLIENT_ID";
    public static final String NOTION_CLIENT_SECRET = "NOTION_CLIENT_SECRET";
    public static final String NOTION_OAUTH_REDIRECT_URI = "NOTION_OAUTH_REDIRECT_URI";
    public static final String GITHUB_CLIENT_ID = "GITHUB_CLIENT_ID";
    public static final String GITHUB_CLIENT_SECRET = "GITHUB_CLIENT_SECRET";
    public static final String GITHUB_OAUTH_REDIRECT_URI = "GITHUB_OAUTH_REDIRECT_URI";
    public static final String GOOGLE_OAUTH_CLIENT_ID = "GOOGLE_OAUTH_CLIENT_ID";
    public static final String GOOGLE_OAUTH_CLIENT_SECRET = "GOOGLE_OAUTH_CLIENT_SECRET";
    public static final String GOOGLE_OAUTH_REDIRECT_URI = "GOOGLE_OAUTH_REDIRECT_URI";
    public static final String KAKAO_OAUTH_CLIENT_ID = "KAKAO_OAUTH_CLIENT_ID";
    public static final String KAKAO_OAUTH_CLIENT_SECRET = "KAKAO_OAUTH_CLIENT_SECRET";
    public static final String KAKAO_OAUTH_REDIRECT_URI = "KAKAO_OAUTH_REDIRECT_URI";
    /** true일 때만 로그인 화면에 카카오 버튼 노출 (비즈 이메일 권한 확보 후 사용) */
    public static final String KAKAO_OAUTH_ENABLED = "KAKAO_OAUTH_ENABLED";

    private static final Set<String> KNOWN_KEYS = Set.of(
            TOSS_CLIENT_KEY, TOSS_SECRET_KEY,
            NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_OAUTH_REDIRECT_URI,
            GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_OAUTH_REDIRECT_URI,
            GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI,
            KAKAO_OAUTH_CLIENT_ID, KAKAO_OAUTH_CLIENT_SECRET, KAKAO_OAUTH_REDIRECT_URI,
            KAKAO_OAUTH_ENABLED);
    private static final Set<String> SECRET_KEYS = Set.of(
            TOSS_SECRET_KEY, NOTION_CLIENT_SECRET, GITHUB_CLIENT_SECRET,
            GOOGLE_OAUTH_CLIENT_SECRET, KAKAO_OAUTH_CLIENT_SECRET);

    private final IntegrationConfigRepository repository;
    private final LlmSecretsCipher secretsCipher;

    @Transactional(readOnly = true)
    public String getPlain(String key) {
        return repository.findById(key)
                .map(IntegrationConfig::getValueCiphertext)
                .filter(v -> v != null && !v.isBlank())
                .map(secretsCipher::decrypt)
                .orElse("");
    }

    @Transactional(readOnly = true)
    public List<IntegrationSettingItemResponse> listForAdmin() {
        Map<String, IntegrationConfig> byKey = new LinkedHashMap<>();
        for (IntegrationConfig c : repository.findAllByOrderByKeyAsc()) {
            byKey.put(c.getKey(), c);
        }
        return KNOWN_KEYS.stream().sorted().map(key -> {
            IntegrationConfig c = byKey.get(key);
            boolean secret = SECRET_KEYS.contains(key);
            String plain = "";
            if (c != null && c.getValueCiphertext() != null && !c.getValueCiphertext().isBlank()) {
                plain = secretsCipher.decrypt(c.getValueCiphertext());
            }
            boolean configured = plain != null && !plain.isBlank();
            String display = "";
            if (configured) {
                display = secret ? secretsCipher.maskApiKey(plain) : plain;
            }
            return new IntegrationSettingItemResponse(key, categoryFor(key), secret, configured, display);
        }).toList();
    }

    private static String categoryFor(String key) {
        if (key.startsWith("TOSS_")) {
            return "PG";
        }
        if (key.startsWith("NOTION_") || key.startsWith("GITHUB_")) {
            return "IMPORT";
        }
        if (key.startsWith("GOOGLE_OAUTH_") || key.startsWith("KAKAO_OAUTH_")) {
            return "AUTH";
        }
        return "OTHER";
    }

    @Transactional(readOnly = true)
    public IntegrationSettingRevealResponse revealSecret(String key) {
        if (!KNOWN_KEYS.contains(key)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Unknown key: " + key);
        }
        if (!SECRET_KEYS.contains(key)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Not a secret key: " + key);
        }
        String plain = getPlain(key);
        if (plain == null || plain.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Secret is not configured for: " + key);
        }
        return new IntegrationSettingRevealResponse(key, plain);
    }

    @Transactional
    public List<IntegrationSettingItemResponse> update(IntegrationSettingsUpdateRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "items required");
        }
        for (var item : request.items()) {
            if (!KNOWN_KEYS.contains(item.key())) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "Unknown key: " + item.key());
            }
            String value = item.value() == null ? "" : item.value().trim();
            boolean secret = SECRET_KEYS.contains(item.key());
            IntegrationConfig config = repository.findById(item.key()).orElseGet(() ->
                    IntegrationConfig.builder().key(item.key()).secret(secret).build());
            if (secret && isSecretMaskDisplay(value)) {
                // keep existing ciphertext
            } else if (value.isBlank()) {
                config.setValueCiphertext(null);
            } else {
                config.setValueCiphertext(secretsCipher.encrypt(value));
            }
            config.setSecret(secret);
            repository.save(config);
        }
        return listForAdmin();
    }

    /** 관리자 UI가 마스킹된 값을 그대로 다시 보낼 때 덮어쓰지 않는다. */
    static boolean isSecretMaskDisplay(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String v = value.trim();
        return v.contains("…") || v.contains("...") || v.matches("\\*{3,}.*") || v.endsWith("****");
    }
}
