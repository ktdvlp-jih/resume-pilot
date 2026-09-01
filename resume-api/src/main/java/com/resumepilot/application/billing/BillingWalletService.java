package com.resumepilot.application.billing;

import com.resumepilot.domain.billing.*;
import com.resumepilot.global.exception.BusinessException;
import com.resumepilot.global.exception.ErrorCode;
import com.resumepilot.presentation.dto.billing.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingWalletService {

    private final EntitlementLotRepository lotRepository;
    private final BillingOperationCostRepository costRepository;
    private final BillingProductRepository productRepository;
    private final EntitlementService entitlementService;

    @Transactional(readOnly = true)
    public WalletResponse wallet(UUID userId) {
        Instant now = Instant.now();
        long tokens = lotRepository.sumTokenRemaining(userId, now);
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object[] row : lotRepository.sumCountRemainingByOperation(userId, now)) {
            counts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        List<OperationCostResponse> costs = costRepository.findAllByOrderByOperationAsc().stream()
                .map(c -> new OperationCostResponse(c.getOperation(), c.getTokenCost()))
                .toList();
        return new WalletResponse(tokens, counts, costs);
    }

    @Transactional(readOnly = true)
    public List<BillingProductResponse> listEnabledProducts() {
        return productRepository.findByEnabledTrueOrderBySortOrderAsc().stream()
                .map(this::toProduct)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BillingProductResponse> listAllProducts() {
        return productRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toProduct)
                .toList();
    }

    @Transactional
    public BillingProductResponse upsertProduct(BillingProductUpsertRequest req) {
        validateProduct(req);
        BillingProduct product;
        if (req.id() != null) {
            product = productRepository.findById(req.id())
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        } else {
            product = new BillingProduct();
        }
        product.setName(req.name().trim());
        product.setKind(BillingProductKind.valueOf(req.kind()));
        product.setOperation(product.getKind() == BillingProductKind.COUNT ? req.operation().trim() : null);
        product.setGrantAmount(req.grantAmount());
        product.setPriceKrw(req.priceKrw());
        product.setEnabled(req.enabled() == null || req.enabled());
        product.setSortOrder(req.sortOrder() == null ? 0 : req.sortOrder());
        return toProduct(productRepository.save(product));
    }

    @Transactional
    public OperationCostResponse updateCost(String operation, int tokenCost) {
        if (tokenCost < 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "tokenCost must be >= 0");
        }
        BillingOperationCost cost = costRepository.findById(operation)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Unknown operation"));
        cost.setTokenCost(tokenCost);
        costRepository.save(cost);
        return new OperationCostResponse(cost.getOperation(), cost.getTokenCost());
    }

    @Transactional(readOnly = true)
    public List<OperationCostResponse> listCosts() {
        return costRepository.findAllByOrderByOperationAsc().stream()
                .map(c -> new OperationCostResponse(c.getOperation(), c.getTokenCost()))
                .toList();
    }

    @Transactional
    public WalletResponse adminGrant(UUID userId, AdminGrantRequest req) {
        BillingProductKind kind = BillingProductKind.valueOf(req.kind());
        entitlementService.adminGrant(userId, kind, req.operation(), req.amount(), req.note());
        return wallet(userId);
    }

    private void validateProduct(BillingProductUpsertRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "name required");
        }
        BillingProductKind kind;
        try {
            kind = BillingProductKind.valueOf(req.kind());
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "kind must be TOKEN or COUNT");
        }
        if (req.grantAmount() <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "grantAmount must be > 0");
        }
        if (req.priceKrw() < 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "priceKrw must be >= 0");
        }
        if (kind == BillingProductKind.COUNT && (req.operation() == null || req.operation().isBlank())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "operation required for COUNT");
        }
    }

    private BillingProductResponse toProduct(BillingProduct p) {
        return new BillingProductResponse(
                p.getId(),
                p.getName(),
                p.getKind().name(),
                p.getOperation(),
                p.getGrantAmount(),
                p.getPriceKrw(),
                p.isEnabled(),
                p.getSortOrder()
        );
    }
}
