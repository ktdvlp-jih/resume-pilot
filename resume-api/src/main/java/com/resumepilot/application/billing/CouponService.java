package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.billing.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CouponService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final BillingCouponRepository couponRepository;
    private final BillingCouponRedemptionRepository redemptionRepository;
    private final EntitlementService entitlementService;
    private final BillingWalletService walletService;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CouponResponse> listCoupons() {
        return couponRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CouponResponse createCoupon(CreateCouponRequest req, UUID adminId) {
        BillingProductKind kind = parseKind(req.kind());
        validateKindOperation(kind, req.operation());
        if (req.grantAmount() == null || req.grantAmount() <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "grantAmount must be > 0");
        }
        int maxRedemptions = req.maxRedemptions() == null ? 1 : req.maxRedemptions();
        if (maxRedemptions <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "maxRedemptions must be > 0");
        }
        String code = normalizeCode(req.code());
        if (code == null) {
            code = generateUniqueCode();
        } else if (couponRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Coupon code already exists");
        }
        Instant validUntil = req.validUntil();
        if (validUntil != null && validUntil.isBefore(Instant.now())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "validUntil must be in the future");
        }
        BillingCoupon coupon = BillingCoupon.builder()
                .code(code)
                .kind(kind)
                .operation(kind == BillingProductKind.COUNT ? req.operation().trim() : null)
                .grantAmount(req.grantAmount())
                .maxRedemptions(maxRedemptions)
                .validUntil(validUntil)
                .note(trimToNull(req.note()))
                .createdByAdminId(adminId)
                .build();
        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public CouponResponse setCouponEnabled(UUID couponId, boolean enabled) {
        BillingCoupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        coupon.setEnabled(enabled);
        return toResponse(couponRepository.save(coupon));
    }

    @Transactional
    public WalletResponse redeem(UUID userId, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "code required");
        }
        String code = normalizeCode(rawCode);
        BillingCoupon coupon = couponRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Invalid coupon code"));
        validateRedeemable(coupon, userId);
        UUID ledgerId = entitlementService.grantFromCoupon(userId, coupon);
        coupon.setRedemptionCount(coupon.getRedemptionCount() + 1);
        couponRepository.save(coupon);
        redemptionRepository.save(BillingCouponRedemption.builder()
                .couponId(coupon.getId())
                .userId(userId)
                .ledgerId(ledgerId)
                .build());
        return walletService.wallet(userId);
    }

    private void validateRedeemable(BillingCoupon coupon, UUID userId) {
        if (!coupon.isEnabled()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Coupon is disabled");
        }
        Instant now = Instant.now();
        if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Coupon is not active yet");
        }
        if (coupon.getValidUntil() != null && now.isAfter(coupon.getValidUntil())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Coupon has expired");
        }
        if (coupon.getRedemptionCount() >= coupon.getMaxRedemptions()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Coupon redemption limit reached");
        }
        if (redemptionRepository.existsByCouponIdAndUserId(coupon.getId(), userId)) {
            throw new BusinessException(ErrorCode.CONFLICT, "Coupon already redeemed");
        }
    }

    private CouponResponse toResponse(BillingCoupon coupon) {
        String adminEmail = null;
        if (coupon.getCreatedByAdminId() != null) {
            adminEmail = userRepository.findById(coupon.getCreatedByAdminId())
                    .map(u -> u.getEmail())
                    .orElse(null);
        }
        return new CouponResponse(
                coupon.getId(),
                coupon.getCode(),
                coupon.getKind().name(),
                coupon.getOperation(),
                coupon.getGrantAmount(),
                coupon.getMaxRedemptions(),
                coupon.getRedemptionCount(),
                coupon.getValidFrom(),
                coupon.getValidUntil(),
                coupon.isEnabled(),
                coupon.getNote(),
                adminEmail,
                coupon.getCreatedAt()
        );
    }

    private static BillingProductKind parseKind(String kind) {
        try {
            return BillingProductKind.valueOf(kind);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "kind must be TOKEN or COUNT");
        }
    }

    private static void validateKindOperation(BillingProductKind kind, String operation) {
        if (kind == BillingProductKind.COUNT && (operation == null || operation.isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "operation required for COUNT");
        }
    }

    private static String normalizeCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim().toUpperCase().replaceAll("[^A-Z0-9-]", "");
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = randomCode(10);
            if (!couponRepository.existsByCodeIgnoreCase(code)) {
                return code;
            }
        }
        throw new BusinessException(ErrorCode.INTERNAL_ERROR, "Could not generate coupon code");
    }

    private static String randomCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
