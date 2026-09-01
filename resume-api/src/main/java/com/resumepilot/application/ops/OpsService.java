package com.resumepilot.application.ops;

import com.resumepilot.application.billing.BillingWalletService;
import com.resumepilot.application.billing.FreeAllowanceService;
import com.resumepilot.domain.billing.Payment;
import com.resumepilot.domain.billing.PaymentRepository;
import com.resumepilot.domain.user.User;
import com.resumepilot.domain.user.UserRepository;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.billing.AdminGrantRequest;
import com.resumepilot.presentation.dto.billing.WalletResponse;
import com.resumepilot.presentation.dto.ops.OpsGrantRequest;
import com.resumepilot.presentation.dto.ops.OpsPaymentSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OpsService {

    private final UserRepository userRepository;
    private final BillingWalletService walletService;
    private final FreeAllowanceService freeAllowanceService;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> healthSummary() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("users", userRepository.count());
        body.put("payments", paymentRepository.count());
        return body;
    }

    @Transactional(readOnly = true)
    public WalletResponse walletByEmail(String email) {
        return walletService.wallet(requireUser(email).getId());
    }

    @Transactional
    public WalletResponse grant(OpsGrantRequest request) {
        User user = requireUser(request.email());
        return walletService.adminGrant(user.getId(), new AdminGrantRequest(
                request.kind(),
                request.operation(),
                request.amount(),
                request.note()
        ));
    }

    @Transactional
    public Map<String, Object> grantFreeAllowance(String email) {
        User user = requireUser(email);
        boolean granted = freeAllowanceService.grantForCurrentPeriod(user.getId());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", user.getEmail());
        body.put("userId", user.getId());
        body.put("granted", granted);
        body.put("periodKey", FreeAllowanceService.currentPeriodKey());
        body.put("wallet", walletService.wallet(user.getId()));
        return body;
    }

    @Transactional(readOnly = true)
    public List<OpsPaymentSummaryResponse> recentPayments(int limit) {
        int size = Math.min(Math.max(limit, 1), 100);
        return paymentRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, size)).stream()
                .map(this::toPayment)
                .toList();
    }

    private User requireUser(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "email required");
        }
        return userRepository.findByEmail(email.trim().toLowerCase())
                .or(() -> userRepository.findByEmail(email.trim()))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "User not found"));
    }

    private OpsPaymentSummaryResponse toPayment(Payment p) {
        return new OpsPaymentSummaryResponse(
                p.getId(),
                p.getUserId(),
                p.getOrderId(),
                p.getAmountKrw(),
                p.getStatus() == null ? null : p.getStatus().name(),
                p.getCreatedAt()
        );
    }
}
