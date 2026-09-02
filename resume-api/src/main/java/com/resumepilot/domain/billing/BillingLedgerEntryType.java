package com.resumepilot.domain.billing;

public enum BillingLedgerEntryType {
    GRANT,
    CONSUME,
    REFUND,
    CANCEL_RECLAIM,
    ADMIN_GRANT,
    FREE_GRANT,
    COUPON_REDEEM
}
