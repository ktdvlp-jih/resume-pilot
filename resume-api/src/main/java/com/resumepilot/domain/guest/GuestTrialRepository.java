package com.resumepilot.domain.guest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface GuestTrialRepository extends JpaRepository<GuestTrial, UUID> {

    Optional<GuestTrial> findByGuestId(String guestId);

    @Query("SELECT COUNT(g) FROM GuestTrial g WHERE g.ip = :ip AND g.createdAt >= :since")
    long countByIpSince(String ip, Instant since);
}
