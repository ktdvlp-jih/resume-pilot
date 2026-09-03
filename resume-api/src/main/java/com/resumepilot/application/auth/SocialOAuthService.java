package com.resumepilot.application.auth;

import com.resumepilot.application.billing.FreeAllowanceService;
import com.resumepilot.application.billing.IntegrationSettingsService;
import com.resumepilot.application.mail.MailService;
import com.resumepilot.domain.user.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.auth.GoogleOAuthClient;
import com.resumepilot.infrastructure.auth.KakaoOAuthClient;
import com.resumepilot.presentation.dto.auth.LinkOAuthRequest;
import com.resumepilot.presentation.dto.auth.OAuthAuthorizeResponse;
import com.resumepilot.presentation.dto.auth.OAuthProvidersResponse;
import com.resumepilot.presentation.dto.auth.SendOAuthLinkEmailRequest;
import com.resumepilot.presentation.dto.auth.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SocialOAuthService {

    public static final String PROVIDER_GOOGLE = "google";
    public static final String PROVIDER_KAKAO = "kakao";
    private static final String PURPOSE_OAUTH_LINK = "OAUTH_LINK";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final FreeAllowanceService freeAllowanceService;
    private final AuthService authService;
    private final SocialOAuthStateCodec stateCodec;
    private final GoogleOAuthClient googleOAuthClient;
    private final KakaoOAuthClient kakaoOAuthClient;
    private final IntegrationSettingsService integrationSettings;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final MailService mailService;

    @Value("${app.public-web-url:http://localhost:5173}")
    private String publicWebUrl;

    @Value("${auth.verification-token-ttl-hours:24}")
    private long verificationTokenTtlHours;

    @Value("${auth.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.public-api-url:http://localhost:8080}")
    private String publicApiUrl;

    @Value("${oauth.google.client-id:}")
    private String googleClientIdEnv;

    @Value("${oauth.google.client-secret:}")
    private String googleClientSecretEnv;

    @Value("${oauth.google.redirect-uri:}")
    private String googleRedirectUriEnv;

    @Value("${oauth.kakao.client-id:}")
    private String kakaoClientIdEnv;

    @Value("${oauth.kakao.client-secret:}")
    private String kakaoClientSecretEnv;

    @Value("${oauth.kakao.redirect-uri:}")
    private String kakaoRedirectUriEnv;

    @Value("${oauth.kakao.enabled:false}")
    private boolean kakaoEnabledEnv;

    public OAuthProvidersResponse providers() {
        return new OAuthProvidersResponse(isGoogleConfigured(), isKakaoConfigured());
    }

    public OAuthAuthorizeResponse buildAuthorizeUrl(
            String provider,
            String frontendUrl,
            String returnPath,
            boolean termsAccepted,
            boolean privacyAccepted) {
        String normalized = normalizeProvider(provider);
        String web = resolveFrontendUrl(frontendUrl);
        String path = sanitizeReturnPath(returnPath);
        String state = stateCodec.encode(new SocialOAuthStateCodec.State(
                normalized,
                web,
                path,
                Instant.now().getEpochSecond(),
                termsAccepted,
                privacyAccepted));

        if (PROVIDER_GOOGLE.equals(normalized)) {
            requireGoogle();
            return new OAuthAuthorizeResponse(
                    googleOAuthClient.buildAuthorizeUrl(googleClientId(), resolveGoogleRedirect(), state),
                    PROVIDER_GOOGLE);
        }
        requireKakao();
        return new OAuthAuthorizeResponse(
                kakaoOAuthClient.buildAuthorizeUrl(kakaoClientId(), resolveKakaoRedirect(), state),
                PROVIDER_KAKAO);
    }

    @Transactional
    public String handleCallback(String provider, String code, String stateParam) {
        String normalized = normalizeProvider(provider);
        SocialOAuthStateCodec.State state = stateCodec.decode(stateParam);
        if (!normalized.equals(state.provider())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth provider가 일치하지 않습니다");
        }
        if (code == null || code.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "OAuth code가 없습니다");
        }

        String oauthId;
        String email;
        String name;
        if (PROVIDER_GOOGLE.equals(normalized)) {
            requireGoogle();
            GoogleOAuthClient.Profile profile = googleOAuthClient.exchangeAndFetchProfile(
                    googleClientId(), googleClientSecret(), code, resolveGoogleRedirect());
            oauthId = profile.id();
            email = profile.email();
            name = profile.name();
        } else {
            requireKakao();
            KakaoOAuthClient.Profile profile = kakaoOAuthClient.exchangeAndFetchProfile(
                    kakaoClientId(), kakaoClientSecret(), code, resolveKakaoRedirect());
            oauthId = profile.id();
            email = profile.email();
            name = profile.name();
        }

        return resolveOrCreateUser(normalized, oauthId, email, name, state);
    }

    @Transactional
    public TokenResponse confirmLink(LinkOAuthRequest request) {
        SocialOAuthStateCodec.LinkPending pending = stateCodec.decodeLink(request.linkToken());
        User user = loadUserForLink(pending);

        boolean emailOk = request.emailToken() != null && !request.emailToken().isBlank()
                && consumeOAuthLinkEmailToken(user.getId(), request.emailToken());
        if (!emailOk) {
            if (!hasPassword(user)) {
                throw new BusinessException(ErrorCode.INVALID_INPUT, "이메일 인증으로 계정 연결을 완료해 주세요");
            }
            if (request.password() == null || request.password().isBlank()
                    || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "비밀번호가 올바르지 않습니다");
            }
        }

        return finalizeLink(user, pending);
    }

    @Transactional
    public void sendLinkEmail(SendOAuthLinkEmailRequest request) {
        SocialOAuthStateCodec.LinkPending pending = stateCodec.decodeLink(request.linkToken());
        User user = loadUserForLink(pending);
        Instant cooldownStart = Instant.now().minusSeconds(Math.max(1, resendCooldownSeconds));
        if (emailVerificationTokenRepository.existsByUserIdAndPurposeAndCreatedAtAfter(
                user.getId(), PURPOSE_OAUTH_LINK, cooldownStart)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "잠시 후 다시 요청해 주세요");
        }

        // 이메일 확인 시간 확보를 위해 연결 토큰 재발급
        String refreshedLinkToken = stateCodec.encodeLink(new SocialOAuthStateCodec.LinkPending(
                pending.provider(),
                pending.oauthId(),
                pending.email(),
                pending.name() == null ? "" : pending.name(),
                pending.userId(),
                Instant.now().getEpochSecond()));

        String rawToken = generateRawToken();
        emailVerificationTokenRepository.save(EmailVerificationToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(rawToken))
                .purpose(PURPOSE_OAUTH_LINK)
                .expiresAt(Instant.now().plus(verificationTokenTtlHours, ChronoUnit.HOURS))
                .build());

        String linkUrl = UriComponentsBuilder
                .fromUriString(trimTrailingSlash(publicWebUrl) + "/auth/callback")
                .queryParam("linkRequired", "1")
                .queryParam("linkToken", refreshedLinkToken)
                .queryParam("email", maskEmail(user.getEmail()))
                .queryParam("provider", pending.provider())
                .queryParam("passwordRequired", hasPassword(user) ? "1" : "0")
                .queryParam("emailConfirm", "1")
                .queryParam("emailToken", rawToken)
                .build()
                .encode()
                .toUriString();
        mailService.sendOAuthLinkEmail(user.getEmail(), linkUrl);
    }

    private User loadUserForLink(SocialOAuthStateCodec.LinkPending pending) {
        UUID userId;
        try {
            userId = UUID.fromString(pending.userId());
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "계정 연결 정보가 올바르지 않습니다");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "계정을 찾을 수 없습니다"));
        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
        }
        if (!pending.email().equalsIgnoreCase(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "계정 연결 정보가 일치하지 않습니다");
        }
        if (user.getOauthProvider() != null && user.getOauthId() != null
                && !(pending.provider().equals(user.getOauthProvider())
                && pending.oauthId().equals(user.getOauthId()))) {
            throw new BusinessException(ErrorCode.CONFLICT, "이미 다른 소셜 계정과 연결된 이메일입니다");
        }
        return user;
    }

    private boolean consumeOAuthLinkEmailToken(UUID userId, String rawToken) {
        String tokenHash = hashToken(rawToken.trim());
        EmailVerificationToken stored = emailVerificationTokenRepository
                .findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN, "이메일 인증 링크가 올바르지 않거나 만료되었습니다"));
        if (!PURPOSE_OAUTH_LINK.equals(stored.getPurpose()) || !userId.equals(stored.getUserId())) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "이메일 인증 링크가 올바르지 않습니다");
        }
        if (stored.isExpired()) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "이메일 인증 링크가 만료되었습니다");
        }
        stored.setUsedAt(Instant.now());
        emailVerificationTokenRepository.save(stored);
        return true;
    }

    private TokenResponse finalizeLink(User user, SocialOAuthStateCodec.LinkPending pending) {
        user.setOauthProvider(pending.provider());
        user.setOauthId(pending.oauthId());
        user.setEmailVerified(true);
        Instant now = Instant.now();
        if (user.getTermsAcceptedAt() == null) {
            user.setTermsAcceptedAt(now);
        }
        if (user.getPrivacyAcceptedAt() == null) {
            user.setPrivacyAcceptedAt(now);
        }
        userRepository.save(user);
        return authService.issueTokensForUser(user);
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR);
        }
    }

    public String buildErrorRedirect(String frontendUrl, String message) {
        return buildReturnRedirect(frontendUrl, "/login", "error", message);
    }

    /** SNS 취소·실패 시 /auth/callback 대신 원래 로그인·가입 페이지로 */
    public String buildReturnRedirectFromState(String stateParam, String reason, String message) {
        String frontendUrl = null;
        String returnPath = "/login";
        if (stateParam != null && !stateParam.isBlank()) {
            try {
                SocialOAuthStateCodec.State state = stateCodec.decode(stateParam);
                frontendUrl = state.frontendUrl();
                returnPath = sanitizeReturnPath(state.returnPath());
            } catch (Exception ignored) {
                // state 파싱 실패 시 기본 로그인으로
            }
        }
        return buildReturnRedirect(frontendUrl, returnPath, reason, message);
    }

    private String buildReturnRedirect(String frontendUrl, String returnPath, String reason, String message) {
        String web = resolveFrontendUrl(frontendUrl);
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(trimTrailingSlash(web) + sanitizeReturnPath(returnPath))
                .queryParam("oauth", reason == null || reason.isBlank() ? "error" : reason);
        if (message != null && !message.isBlank() && !"cancelled".equals(reason)) {
            // 취소는 문구만 i18n, 그 외는 짧은 안내 (콜백 에러 페이지 대신)
            String trimmed = message.length() > 120 ? message.substring(0, 120) : message;
            builder.queryParam("oauthMessage", trimmed);
        }
        return builder.build().encode().toUriString();
    }

    private static String sanitizeReturnPath(String returnPath) {
        if (returnPath == null || returnPath.isBlank()) {
            return "/login";
        }
        String path = returnPath.trim();
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        // open redirect 방지: 상대 경로만, 로그인·가입만 허용
        if ("/signup".equals(path) || path.startsWith("/signup?")) {
            return "/signup";
        }
        if ("/login".equals(path) || path.startsWith("/login?")) {
            return "/login";
        }
        return "/login";
    }

    private String resolveOrCreateUser(
            String provider,
            String oauthId,
            String email,
            String name,
            SocialOAuthStateCodec.State state) {
        String frontendUrl = state.frontendUrl();
        return userRepository.findByOauthProviderAndOauthId(provider, oauthId)
                .map(existing -> {
                    if (!existing.isEnabled()) {
                        throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
                    }
                    if (!existing.isEmailVerified()) {
                        existing.setEmailVerified(true);
                        userRepository.save(existing);
                    }
                    return buildSuccessRedirect(frontendUrl, authService.issueTokensForUser(existing));
                })
                .orElseGet(() -> linkOrCreate(provider, oauthId, email, name, state));
    }

    private String linkOrCreate(
            String provider,
            String oauthId,
            String email,
            String name,
            SocialOAuthStateCodec.State state) {
        String frontendUrl = state.frontendUrl();
        return userRepository.findByEmail(email).map(existing -> {
            if (!existing.isEnabled()) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
            }
            if (existing.getOauthProvider() != null && existing.getOauthId() != null
                    && !(provider.equals(existing.getOauthProvider())
                    && oauthId.equals(existing.getOauthId()))) {
                throw new BusinessException(ErrorCode.CONFLICT,
                        "이미 다른 소셜 계정과 연결된 이메일입니다");
            }
            // 이미 같은 SNS가 연결된 경우 (이론상 oauth 조회로 잡힘) → 바로 로그인
            if (provider.equals(existing.getOauthProvider()) && oauthId.equals(existing.getOauthId())) {
                existing.setEmailVerified(true);
                userRepository.save(existing);
                return buildSuccessRedirect(frontendUrl, authService.issueTokensForUser(existing));
            }
            // 이메일 가입 계정 등 → 사용자 확인 후 연결
            String linkToken = stateCodec.encodeLink(new SocialOAuthStateCodec.LinkPending(
                    provider,
                    oauthId,
                    email,
                    name == null ? "" : name,
                    existing.getId().toString(),
                    Instant.now().getEpochSecond()));
            return buildLinkRequiredRedirect(
                    frontendUrl, linkToken, maskEmail(email), provider, hasPassword(existing));
        }).orElseGet(() -> {
            if (!state.hasLegalConsent()) {
                throw new BusinessException(ErrorCode.INVALID_INPUT,
                        "서비스 이용약관과 개인정보처리방침에 동의해 주세요");
            }
            Instant consentedAt = Instant.now();
            User user = userRepository.save(User.builder()
                    .email(email)
                    .passwordHash(null)
                    .role(UserRole.USER)
                    .oauthProvider(provider)
                    .oauthId(oauthId)
                    .emailVerified(true)
                    .termsAcceptedAt(consentedAt)
                    .privacyAcceptedAt(consentedAt)
                    .build());
            userProfileRepository.save(UserProfile.builder()
                    .userId(user.getId())
                    .name(name)
                    .build());
            freeAllowanceService.grantForCurrentPeriod(user.getId());
            return buildSuccessRedirect(frontendUrl, authService.issueTokensForUser(user));
        });
    }

    private String buildLinkRequiredRedirect(
            String frontendUrl,
            String linkToken,
            String emailMasked,
            String provider,
            boolean passwordRequired) {
        String web = resolveFrontendUrl(frontendUrl);
        return UriComponentsBuilder.fromUriString(trimTrailingSlash(web) + "/auth/callback")
                .queryParam("linkRequired", "1")
                .queryParam("linkToken", linkToken)
                .queryParam("email", emailMasked)
                .queryParam("provider", provider)
                .queryParam("passwordRequired", passwordRequired ? "1" : "0")
                .build()
                .encode()
                .toUriString();
    }

    private String buildSuccessRedirect(String frontendUrl, TokenResponse tokens) {
        String web = resolveFrontendUrl(frontendUrl);
        return UriComponentsBuilder.fromUriString(trimTrailingSlash(web) + "/auth/callback")
                .queryParam("accessToken", tokens.accessToken())
                .queryParam("refreshToken", tokens.refreshToken())
                .queryParam("userId", tokens.userId().toString())
                .build()
                .encode()
                .toUriString();
    }

    private static boolean hasPassword(User user) {
        return user.getPasswordHash() != null && !user.getPasswordHash().isBlank();
    }

    static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "";
        }
        String trimmed = email.trim();
        int at = trimmed.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = trimmed.substring(0, at);
        String domain = trimmed.substring(at);
        if (local.length() <= 2) {
            return local.charAt(0) + "***" + domain;
        }
        return local.substring(0, 2) + "***" + domain;
    }

    private String normalizeProvider(String provider) {
        if (provider == null || provider.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "지원하지 않는 소셜 로그인입니다");
        }
        String normalized = provider.trim().toLowerCase();
        if (!PROVIDER_GOOGLE.equals(normalized) && !PROVIDER_KAKAO.equals(normalized)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "지원하지 않는 소셜 로그인입니다");
        }
        return normalized;
    }

    private void requireGoogle() {
        if (!isGoogleConfigured()) {
            throw new BusinessException(ErrorCode.OAUTH_NOT_CONFIGURED, "Google 로그인이 설정되지 않았습니다");
        }
    }

    private void requireKakao() {
        if (!isKakaoConfigured()) {
            throw new BusinessException(ErrorCode.OAUTH_NOT_CONFIGURED, "카카오 로그인이 설정되지 않았습니다");
        }
    }

    private boolean isGoogleConfigured() {
        return notBlank(googleClientId()) && notBlank(googleClientSecret());
    }

    private boolean isKakaoConfigured() {
        return isKakaoLoginEnabled() && notBlank(kakaoClientId());
    }

    private boolean isKakaoLoginEnabled() {
        String fromDb = integrationSettings.getPlain(IntegrationSettingsService.KAKAO_OAUTH_ENABLED);
        if (notBlank(fromDb)) {
            String v = fromDb.trim();
            return "true".equalsIgnoreCase(v) || "1".equals(v) || "yes".equalsIgnoreCase(v);
        }
        return kakaoEnabledEnv;
    }

    private String googleClientId() {
        return firstConfigured(IntegrationSettingsService.GOOGLE_OAUTH_CLIENT_ID, googleClientIdEnv);
    }

    private String googleClientSecret() {
        return firstConfigured(IntegrationSettingsService.GOOGLE_OAUTH_CLIENT_SECRET, googleClientSecretEnv);
    }

    private String kakaoClientId() {
        return firstConfigured(IntegrationSettingsService.KAKAO_OAUTH_CLIENT_ID, kakaoClientIdEnv);
    }

    private String kakaoClientSecret() {
        return firstConfigured(IntegrationSettingsService.KAKAO_OAUTH_CLIENT_SECRET, kakaoClientSecretEnv);
    }

    private String resolveGoogleRedirect() {
        String configured = firstConfigured(
                IntegrationSettingsService.GOOGLE_OAUTH_REDIRECT_URI, googleRedirectUriEnv);
        if (notBlank(configured)) {
            return configured;
        }
        return trimTrailingSlash(publicApiUrl) + "/api/v1/auth/oauth/google/callback";
    }

    private String resolveKakaoRedirect() {
        String configured = firstConfigured(
                IntegrationSettingsService.KAKAO_OAUTH_REDIRECT_URI, kakaoRedirectUriEnv);
        if (notBlank(configured)) {
            return configured;
        }
        return trimTrailingSlash(publicApiUrl) + "/api/v1/auth/oauth/kakao/callback";
    }

    private String firstConfigured(String dbKey, String envFallback) {
        String fromDb = integrationSettings.getPlain(dbKey);
        if (notBlank(fromDb)) {
            return fromDb.trim();
        }
        return envFallback == null ? "" : envFallback.trim();
    }

    private String resolveFrontendUrl(String frontendUrl) {
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            return frontendUrl.trim();
        }
        return publicWebUrl;
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
