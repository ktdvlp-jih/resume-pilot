package com.resumepilot.domain.guest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface GuestTrialUseRepository extends JpaRepository<GuestTrialUse, UUID> {

    @Query("SELECT u.operation, COUNT(u) FROM GuestTrialUse u WHERE u.guestId = :guestId GROUP BY u.operation")
    List<Object[]> countByGuestIdGroupedByOperation(String guestId);

    @Query("SELECT COUNT(u) FROM GuestTrialUse u WHERE u.guestId = :guestId")
    long countByGuestId(String guestId);
}
