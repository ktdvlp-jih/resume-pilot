package com.resumepilot.application.auth;

import com.resumepilot.application.billing.FreeAllowanceService;
import com.resumepilot.application.mail.MailService;
import com.resumepilot.domain.user.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.security.JwtTokenProvider;
import com.resumepilot.presentation.dto.auth.*;
import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String PURPOSE_SIGNUP = "SIGNUP";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final FreeAllowanceService freeAllowanceService;
    private final MailService mailService;

    @Value("${auth.email-verification-bypass:false}")
    private boolean emailVerificationBypass;

    @Value("${auth.verification-token-ttl-hours:24}")
    private long verificationTokenTtlHours;

    @Value("${auth.resend-cooldown-seconds:60}")
    private long resendCooldownSeconds;

    @Value("${app.public-web-url:http://localhost:5173}")
    private String publicWebUrl;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        Instant consentedAt = Instant.now();
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.USER)
                .emailVerified(emailVerificationBypass)
                .termsAcceptedAt(consentedAt)
                .privacyAcceptedAt(consentedAt)
                .build();
        userRepository.save(user);

        userProfileRepository.save(UserProfile.builder()
                .userId(user.getId())
                .name(request.name())
                .build());

        freeAllowanceService.grantForCurrentPeriod(user.getId());

        if (emailVerificationBypass) {
            return SignupResponse.verified(issueTokens(user));
        }

        sendVerificationMail(user);
        return SignupResponse.pending(
                email,
                "가입이 완료되었습니다. 이메일로 보낸 인증 링크를 확인해 주세요.");
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
        }
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!user.isEmailVerified() && !emailVerificationBypass) {
            throw new BusinessException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse verifyEmail(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "인증 링크가 올바르지 않습니다");
        }
        String tokenHash = hashToken(rawToken.trim());
        EmailVerificationToken stored = emailVerificationTokenRepository
                .findByTokenHashAndUsedAtIsNull(tokenHash)
                .orElse(null);
        if (stored == null) {
            EmailVerificationToken used = emailVerificationTokenRepository.findByTokenHash(tokenHash)
                    .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN, "인증 링크가 올바르지 않거나 만료되었습니다"));
            User existing = userRepository.findById(used.getUserId()).orElse(null);
            if (existing != null && existing.isEmailVerified()) {
                throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED,
                        "이미 이메일 인증이 완료되었습니다. 로그인해 주세요.");
            }
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "인증 링크가 올바르지 않거나 만료되었습니다");
        }
        if (stored.isExpired()) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN, "인증 링크가 만료되었습니다");
        }
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
        }
        if (user.isEmailVerified()) {
            stored.setUsedAt(Instant.now());
            emailVerificationTokenRepository.save(stored);
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED,
                    "이미 이메일 인증이 완료되었습니다. 로그인해 주세요.");
        }
        user.setEmailVerified(true);
        stored.setUsedAt(Instant.now());
        emailVerificationTokenRepository.save(stored);
        return issueTokens(user);
    }

    @Transactional
    public void resendVerification(ResendVerificationRequest request) {
        String email = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "가입된 이메일이 아닙니다"));
        if (user.isEmailVerified()) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_VERIFIED);
        }
        Instant cooldownStart = Instant.now().minusSeconds(Math.max(1, resendCooldownSeconds));
        if (emailVerificationTokenRepository.existsByUserIdAndPurposeAndCreatedAtAfter(
                user.getId(), PURPOSE_SIGNUP, cooldownStart)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "잠시 후 다시 시도해 주세요");
        }
        sendVerificationMail(user);
    }

    /** 스모크·내부 도구: 이메일 인증을 강제로 완료하고 토큰 발급 */
    @Transactional
    public TokenResponse forceVerifyEmail(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "가입된 이메일이 아닙니다"));
        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "비활성화된 계정입니다");
        }
        user.setEmailVerified(true);
        return issueTokens(user);
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        String hash = hashToken(request.refreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHashAndRevokedFalse(hash)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        if (!jwtTokenProvider.validateToken(request.refreshToken())) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        Instant refreshExpiresAt = stored.getExpiresAt();
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(user, refreshExpiresAt);
    }

    @Transactional
    public void changePassword(UUID userId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, "현재 비밀번호가 올바르지 않습니다");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public TokenResponse issueTokensForUser(User user) {
        return issueTokens(user);
    }

    private void sendVerificationMail(User user) {
        String rawToken = generateRawToken();
        emailVerificationTokenRepository.save(EmailVerificationToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(rawToken))
                .purpose(PURPOSE_SIGNUP)
                .expiresAt(Instant.now().plus(verificationTokenTtlHours, ChronoUnit.HOURS))
                .build());

        String verifyUrl = UriComponentsBuilder
                .fromUriString(trimTrailingSlash(publicWebUrl) + "/verify-email")
                .queryParam("token", rawToken)
                .build()
                .encode()
                .toUriString();
        mailService.sendVerificationEmail(user.getEmail(), verifyUrl);
    }

    private TokenResponse issueTokens(User user) {
        return issueTokens(user, Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs()));
    }

    private TokenResponse issueTokens(User user, Instant refreshExpiresAt) {
        long refreshTtlMs = refreshExpiresAt.toEpochMilli() - Instant.now().toEpochMilli();
        if (refreshTtlMs <= 0) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }
        String access = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String refresh = jwtTokenProvider.createRefreshToken(
                user.getId(), user.getEmail(), user.getRole().name(), refreshTtlMs);

        refreshTokenRepository.save(RefreshToken.builder()
                .userId(user.getId())
                .tokenHash(hashToken(refresh))
                .expiresAt(refreshExpiresAt)
                .build());

        return new TokenResponse(access, refresh, user.getId(), user.getEmail(), user.getRole().name());
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

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
