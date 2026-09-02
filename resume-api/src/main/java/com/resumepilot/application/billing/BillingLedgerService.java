package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.presentation.dto.billing.LedgerEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingLedgerService {

    private static final List<BillingLedgerEntryType> CREDIT_TYPES = List.of(
            BillingLedgerEntryType.GRANT,
            BillingLedgerEntryType.ADMIN_GRANT,
            BillingLedgerEntryType.FREE_GRANT,
            BillingLedgerEntryType.COUPON_REDEEM,
            BillingLedgerEntryType.REFUND
    );

    private final BillingLedgerRepository ledgerRepository;
    private final BillingCouponRepository couponRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<LedgerEntryResponse> listUserCredits(UUID userId, int limit) {
        int size = clampLimit(limit);
        return ledgerRepository
                .findByUserIdAndEntryTypeInOrderByCreatedAtDesc(userId, CREDIT_TYPES, PageRequest.of(0, size))
                .getContent()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryResponse> listAdminCredits(UUID userId, int limit) {
        int size = clampLimit(limit);
        var page = ledgerRepository.findByUserIdAndEntryTypeInOrderByCreatedAtDesc(
                userId, CREDIT_TYPES, PageRequest.of(0, size));
        return page.getContent().stream().map(this::toResponse).toList();
    }

    private LedgerEntryResponse toResponse(BillingLedgerEntry entry) {
        String adminEmail = null;
        if (entry.getGrantedByAdminId() != null) {
            adminEmail = userRepository.findById(entry.getGrantedByAdminId())
                    .map(u -> u.getEmail())
                    .orElse(null);
        }
        String couponCode = entry.getNote();
        if (entry.getCouponId() != null && (couponCode == null || couponCode.isBlank())) {
            couponCode = couponRepository.findById(entry.getCouponId())
                    .map(BillingCoupon::getCode)
                    .orElse(null);
        }
        return new LedgerEntryResponse(
                entry.getId(),
                entry.getEntryType().name(),
                entry.getKind() == null ? null : entry.getKind().name(),
                entry.getOperation(),
                entry.getAmount(),
                entry.getNote(),
                entry.getCreatedAt(),
                adminEmail,
                entry.getEntryType() == BillingLedgerEntryType.COUPON_REDEEM ? couponCode : null
        );
    }

    private static int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), 100);
    }
}
