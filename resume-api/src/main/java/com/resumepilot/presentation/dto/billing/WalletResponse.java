package com.resumepilot.presentation.dto.billing;

import java.util.List;
import java.util.Map;

public record WalletResponse(
        long tokenBalance,
        Map<String, Long> countBalances,
        List<OperationCostResponse> operationCosts
) {}
