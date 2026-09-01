package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.payment.TossPaymentsClient;
import com.resumepilot.presentation.dto.billing.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final PaymentOrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final BillingProductRepository productRepository;
    private final EntitlementService entitlementService;
    private final IntegrationSettingsService integrationSettings;
    private final TossPaymentsClient tossClient;

    @Transactional(readOnly = true)
    public ClientKeyResponse clientKey() {
        return new ClientKeyResponse(integrationSettings.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY));
    }

    @Transactional
    public CreateOrderResponse createOrder(UUID userId, CreateOrderRequest request) {
        BillingProduct product = productRepository.findById(request.productId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Product not found"));
        if (!product.isEnabled()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Product is disabled");
        }
        ensureTossConfigured();

        String orderId = "rp-" + System.currentTimeMillis() + "-" + random8();
        PaymentOrder order = PaymentOrder.builder()
                .orderId(orderId)
                .userId(userId)
                .productId(product.getId())
                .amountKrw(product.getPriceKrw())
                .orderName(product.getName())
                .status(PaymentOrderStatus.PENDING)
                .expiresAt(Instant.now().plus(30, ChronoUnit.MINUTES))
                .build();
        orderRepository.save(order);
        return new CreateOrderResponse(
                order.getOrderId(),
                order.getAmountKrw(),
                order.getOrderName(),
                customerKey(userId)
        );
    }

    @Transactional
    public ConfirmPaymentResponse confirm(UUID userId, ConfirmPaymentRequest request) {
        ensureTossConfigured();
        Payment existing = paymentRepository.findByOrderId(request.orderId()).orElse(null);
        if (existing != null) {
            if (!existing.getUserId().equals(userId)) {
                throw new BusinessException(ErrorCode.FORBIDDEN);
            }
            return new ConfirmPaymentResponse(existing.getId(), existing.getStatus().name(), "already_confirmed");
        }

        PaymentOrder order = orderRepository.findByOrderIdAndUserId(request.orderId(), userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Order not found"));
        if (order.getStatus() != PaymentOrderStatus.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Order is not pending");
        }
        if (order.getExpiresAt().isBefore(Instant.now())) {
            order.setStatus(PaymentOrderStatus.EXPIRED);
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Order expired");
        }
        if (order.getAmountKrw() != request.amount()) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
        }

        String secret = integrationSettings.getPlain(IntegrationSettingsService.TOSS_SECRET_KEY);
        tossClient.confirm(secret, request.paymentKey(), request.orderId(), request.amount());

        BillingProduct product = entitlementService.requireProduct(order.getProductId());
        Payment payment;
        try {
            payment = paymentRepository.save(Payment.builder()
                    .userId(userId)
                    .productId(product.getId())
                    .orderId(order.getOrderId())
                    .paymentKey(request.paymentKey())
                    .amountKrw(order.getAmountKrw())
                    .status(PaymentStatus.COMPLETED)
                    .build());
        } catch (DataIntegrityViolationException e) {
            Payment raced = paymentRepository.findByOrderId(request.orderId())
                    .orElseThrow(() -> e);
            return new ConfirmPaymentResponse(raced.getId(), raced.getStatus().name(), "already_confirmed");
        }

        entitlementService.grantFromProduct(userId, product, payment.getId(), BillingLedgerEntryType.GRANT);
        order.setStatus(PaymentOrderStatus.CONSUMED);
        return new ConfirmPaymentResponse(payment.getId(), payment.getStatus().name(), "granted");
    }

    @Transactional(readOnly = true)
    public List<PaymentAdminResponse> listPayments() {
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toAdmin)
                .toList();
    }

    @Transactional
    public PaymentAdminResponse cancel(UUID paymentId, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (payment.getStatus() == PaymentStatus.CANCELLED) {
            return toAdmin(payment);
        }
        ensureTossConfigured();
        String secret = integrationSettings.getPlain(IntegrationSettingsService.TOSS_SECRET_KEY);
        String cancelReason = (reason == null || reason.isBlank()) ? "관리자 취소" : reason.trim();

        tossClient.cancel(secret, payment.getPaymentKey(), cancelReason, null);

        payment.setStatus(PaymentStatus.CANCELLED);
        payment.setRefundedAmountKrw(payment.getAmountKrw());
        payment.setCancelledAt(Instant.now());
        paymentRepository.save(payment);

        try {
            entitlementService.reclaimRemainingForPayment(payment.getId(), payment.getUserId());
        } catch (Exception e) {
            log.warn("Entitlement reclaim failed after cancel paymentId={}", payment.getId());
            entitlementService.markManualFixNeeded(payment.getUserId(), payment.getId());
        }
        return toAdmin(payment);
    }

    private PaymentAdminResponse toAdmin(Payment p) {
        String productName = productRepository.findById(p.getProductId())
                .map(BillingProduct::getName)
                .orElse("");
        return new PaymentAdminResponse(
                p.getId(),
                p.getUserId(),
                p.getProductId(),
                productName,
                p.getOrderId(),
                p.getAmountKrw(),
                p.getRefundedAmountKrw(),
                p.getStatus().name(),
                p.getCreatedAt(),
                p.getCancelledAt()
        );
    }

    private void ensureTossConfigured() {
        String client = integrationSettings.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY);
        String secret = integrationSettings.getPlain(IntegrationSettingsService.TOSS_SECRET_KEY);
        if (client.isBlank() || secret.isBlank()) {
            throw new BusinessException(ErrorCode.PAYMENT_NOT_CONFIGURED,
                    "관리자가 연동 설정에서 토스페이먼츠 키를 등록해야 합니다.");
        }
    }

    public static String customerKey(UUID userId) {
        return "rp-" + userId;
    }

    private static String random8() {
        byte[] buf = new byte[4];
        RANDOM.nextBytes(buf);
        return HexFormat.of().formatHex(buf);
    }
}
