package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.infrastructure.payment.TossPaymentsClient;
import com.resumepilot.presentation.dto.billing.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentOrderRepository orderRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock BillingProductRepository productRepository;
    @Mock EntitlementService entitlementService;
    @Mock IntegrationSettingsService integrationSettings;
    @Mock TossPaymentsClient tossClient;
    @InjectMocks PaymentService paymentService;

    private final UUID userId = UUID.randomUUID();
    private BillingProduct product;

    @BeforeEach
    void setUp() {
        product = BillingProduct.builder()
                .id(UUID.randomUUID())
                .name("토큰 100")
                .kind(BillingProductKind.TOKEN)
                .grantAmount(100)
                .priceKrw(1000)
                .enabled(true)
                .build();
    }

    private void configureTossKeys() {
        when(integrationSettings.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY))
                .thenReturn("test_ck_x");
        when(integrationSettings.getPlain(IntegrationSettingsService.TOSS_SECRET_KEY))
                .thenReturn("test_sk_x");
    }

    @Test
    void clientKeyReturnsPlainValue() {
        when(integrationSettings.getPlain(IntegrationSettingsService.TOSS_CLIENT_KEY))
                .thenReturn("test_ck_public");
        assertThat(paymentService.clientKey().clientKey()).isEqualTo("test_ck_public");
    }

    @Test
    void customerKeyUsesRpPrefix() {
        assertThat(PaymentService.customerKey(userId)).isEqualTo("rp-" + userId);
    }

    @Test
    void createOrderFailsWhenKeysMissing() {
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(integrationSettings.getPlain(anyString())).thenReturn("");

        assertThatThrownBy(() -> paymentService.createOrder(userId, new CreateOrderRequest(product.getId())))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_NOT_CONFIGURED);
    }

    @Test
    void createOrderFailsForDisabledProduct() {
        product.setEnabled(false);
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));

        assertThatThrownBy(() -> paymentService.createOrder(userId, new CreateOrderRequest(product.getId())))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    void createOrderPersistsPendingOrderWithServerAmount() {
        configureTossKeys();
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateOrderResponse res = paymentService.createOrder(userId, new CreateOrderRequest(product.getId()));

        assertThat(res.amount()).isEqualTo(1000);
        assertThat(res.orderName()).isEqualTo("토큰 100");
        assertThat(res.orderId()).startsWith("rp-");
        assertThat(res.customerKey()).isEqualTo("rp-" + userId);

        ArgumentCaptor<PaymentOrder> captor = ArgumentCaptor.forClass(PaymentOrder.class);
        verify(orderRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(PaymentOrderStatus.PENDING);
        assertThat(captor.getValue().getAmountKrw()).isEqualTo(1000);
    }

    @Test
    void confirmRejectsAmountMismatch() {
        configureTossKeys();
        when(paymentRepository.findByOrderId("rp-1")).thenReturn(Optional.empty());
        PaymentOrder order = PaymentOrder.builder()
                .orderId("rp-1")
                .userId(userId)
                .productId(product.getId())
                .amountKrw(1000)
                .orderName("토큰 100")
                .status(PaymentOrderStatus.PENDING)
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .build();
        when(orderRepository.findByOrderIdAndUserId("rp-1", userId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> paymentService.confirm(userId,
                new ConfirmPaymentRequest("pk", "rp-1", 999)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
        verifyNoInteractions(tossClient);
    }

    @Test
    void confirmRejectsExpiredOrder() {
        configureTossKeys();
        when(paymentRepository.findByOrderId("rp-exp")).thenReturn(Optional.empty());
        PaymentOrder order = PaymentOrder.builder()
                .orderId("rp-exp")
                .userId(userId)
                .productId(product.getId())
                .amountKrw(1000)
                .orderName("토큰 100")
                .status(PaymentOrderStatus.PENDING)
                .expiresAt(Instant.now().minus(1, ChronoUnit.MINUTES))
                .build();
        when(orderRepository.findByOrderIdAndUserId("rp-exp", userId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> paymentService.confirm(userId,
                new ConfirmPaymentRequest("pk", "rp-exp", 1000)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expired");
        assertThat(order.getStatus()).isEqualTo(PaymentOrderStatus.EXPIRED);
    }

    @Test
    void confirmAlreadyProcessedReturnsIdempotent() {
        configureTossKeys();
        UUID paymentId = UUID.randomUUID();
        Payment existing = Payment.builder()
                .id(paymentId)
                .userId(userId)
                .productId(product.getId())
                .orderId("rp-done")
                .paymentKey("pk")
                .amountKrw(1000)
                .status(PaymentStatus.COMPLETED)
                .build();
        when(paymentRepository.findByOrderId("rp-done")).thenReturn(Optional.of(existing));

        ConfirmPaymentResponse res = paymentService.confirm(userId,
                new ConfirmPaymentRequest("pk", "rp-done", 1000));

        assertThat(res.result()).isEqualTo("already_confirmed");
        assertThat(res.paymentId()).isEqualTo(paymentId);
        verifyNoInteractions(tossClient);
    }

    @Test
    void confirmGrantsAfterTossSuccess() {
        configureTossKeys();
        when(paymentRepository.findByOrderId("rp-new")).thenReturn(Optional.empty());
        PaymentOrder order = PaymentOrder.builder()
                .orderId("rp-new")
                .userId(userId)
                .productId(product.getId())
                .amountKrw(1000)
                .orderName("토큰 100")
                .status(PaymentOrderStatus.PENDING)
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .build();
        when(orderRepository.findByOrderIdAndUserId("rp-new", userId)).thenReturn(Optional.of(order));
        when(entitlementService.requireProduct(product.getId())).thenReturn(product);
        when(paymentRepository.save(any())).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        ConfirmPaymentResponse res = paymentService.confirm(userId,
                new ConfirmPaymentRequest("pk_live", "rp-new", 1000));

        assertThat(res.result()).isEqualTo("granted");
        assertThat(order.getStatus()).isEqualTo(PaymentOrderStatus.CONSUMED);
        verify(tossClient).confirm("test_sk_x", "pk_live", "rp-new", 1000);
        verify(entitlementService).grantFromProduct(eq(userId), eq(product), any(UUID.class),
                eq(BillingLedgerEntryType.GRANT));
    }

    @Test
    void confirmHandlesRaceOnUniqueOrderId() {
        configureTossKeys();
        when(paymentRepository.findByOrderId("rp-race"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(Payment.builder()
                        .id(UUID.randomUUID())
                        .userId(userId)
                        .productId(product.getId())
                        .orderId("rp-race")
                        .paymentKey("pk")
                        .amountKrw(1000)
                        .status(PaymentStatus.COMPLETED)
                        .build()));
        PaymentOrder order = PaymentOrder.builder()
                .orderId("rp-race")
                .userId(userId)
                .productId(product.getId())
                .amountKrw(1000)
                .orderName("토큰 100")
                .status(PaymentOrderStatus.PENDING)
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .build();
        when(orderRepository.findByOrderIdAndUserId("rp-race", userId)).thenReturn(Optional.of(order));
        when(entitlementService.requireProduct(product.getId())).thenReturn(product);
        when(paymentRepository.save(any())).thenThrow(new DataIntegrityViolationException("dup"));

        ConfirmPaymentResponse res = paymentService.confirm(userId,
                new ConfirmPaymentRequest("pk", "rp-race", 1000));

        assertThat(res.result()).isEqualTo("already_confirmed");
        verify(entitlementService, never()).grantFromProduct(any(), any(), any(), any());
    }

    @Test
    void cancelCallsTossAndReclaimsLots() {
        configureTossKeys();
        UUID paymentId = UUID.randomUUID();
        Payment payment = Payment.builder()
                .id(paymentId)
                .userId(userId)
                .productId(product.getId())
                .orderId("rp-c")
                .paymentKey("pk_c")
                .amountKrw(1000)
                .status(PaymentStatus.COMPLETED)
                .build();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(entitlementService.reclaimRemainingForPayment(paymentId, userId)).thenReturn(50);

        PaymentAdminResponse res = paymentService.cancel(paymentId, "테스트 취소");

        assertThat(res.status()).isEqualTo("CANCELLED");
        assertThat(payment.getRefundedAmountKrw()).isEqualTo(1000);
        verify(tossClient).cancel("test_sk_x", "pk_c", "테스트 취소", null);
        verify(entitlementService).reclaimRemainingForPayment(paymentId, userId);
    }

    @Test
    void cancelMarksManualFixWhenReclaimFails() {
        configureTossKeys();
        UUID paymentId = UUID.randomUUID();
        Payment payment = Payment.builder()
                .id(paymentId)
                .userId(userId)
                .productId(product.getId())
                .orderId("rp-c2")
                .paymentKey("pk_c2")
                .amountKrw(1000)
                .status(PaymentStatus.COMPLETED)
                .build();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(entitlementService.reclaimRemainingForPayment(paymentId, userId))
                .thenThrow(new RuntimeException("db down"));

        paymentService.cancel(paymentId, null);

        verify(entitlementService).markManualFixNeeded(userId, paymentId);
    }

    @Test
    void cancelIsIdempotentWhenAlreadyCancelled() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = Payment.builder()
                .id(paymentId)
                .userId(userId)
                .productId(product.getId())
                .orderId("rp-c3")
                .paymentKey("pk")
                .amountKrw(1000)
                .status(PaymentStatus.CANCELLED)
                .build();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));

        paymentService.cancel(paymentId, "again");

        verifyNoInteractions(tossClient);
    }

    @Test
    void listPaymentsMapsProductName() {
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .productId(product.getId())
                .orderId("rp-l")
                .paymentKey("pk")
                .amountKrw(1000)
                .status(PaymentStatus.COMPLETED)
                .createdAt(Instant.now())
                .build();
        when(paymentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(payment));
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));

        List<PaymentAdminResponse> list = paymentService.listPayments();
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().productName()).isEqualTo("토큰 100");
    }
}
