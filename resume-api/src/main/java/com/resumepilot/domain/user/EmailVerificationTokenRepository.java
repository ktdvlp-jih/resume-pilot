package com.resumepilot.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    Optional<EmailVerificationToken> findFirstByUserIdAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(
            UUID userId, String purpose);

    boolean existsByUserIdAndPurposeAndCreatedAtAfter(UUID userId, String purpose, Instant after);
}
