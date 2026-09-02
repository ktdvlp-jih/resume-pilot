-- 관리자 지급·쿠폰 충전 감사 + 쿠폰 발급

ALTER TABLE billing_ledger
    ADD COLUMN granted_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN coupon_id UUID;

ALTER TABLE billing_ledger
    DROP CONSTRAINT chk_billing_ledger_type;

ALTER TABLE billing_ledger
    ADD CONSTRAINT chk_billing_ledger_type CHECK (entry_type IN (
        'GRANT', 'CONSUME', 'REFUND', 'CANCEL_RECLAIM', 'ADMIN_GRANT', 'FREE_GRANT', 'COUPON_REDEEM'
    ));

ALTER TABLE entitlement_lots
    DROP CONSTRAINT chk_entitlement_lots_source;

ALTER TABLE entitlement_lots
    ADD CONSTRAINT chk_entitlement_lots_source CHECK (source IN (
        'PURCHASE', 'ADMIN', 'FREE_MONTHLY', 'COUPON'
    ));

CREATE TABLE billing_coupons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                VARCHAR(40) NOT NULL,
    kind                VARCHAR(20) NOT NULL,
    operation           VARCHAR(50),
    grant_amount        INT NOT NULL,
    max_redemptions     INT NOT NULL DEFAULT 1,
    redemption_count    INT NOT NULL DEFAULT 0,
    valid_from          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until         TIMESTAMPTZ,
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    note                VARCHAR(500),
    created_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_billing_coupons_code UNIQUE (code),
    CONSTRAINT chk_billing_coupons_kind CHECK (kind IN ('TOKEN', 'COUNT')),
    CONSTRAINT chk_billing_coupons_grant CHECK (grant_amount > 0),
    CONSTRAINT chk_billing_coupons_max CHECK (max_redemptions > 0),
    CONSTRAINT chk_billing_coupons_count CHECK (redemption_count >= 0),
    CONSTRAINT chk_billing_coupons_count_op CHECK (
        (kind = 'TOKEN' AND operation IS NULL) OR
        (kind = 'COUNT' AND operation IS NOT NULL)
    )
);

CREATE INDEX idx_billing_coupons_enabled ON billing_coupons(enabled, valid_until);

CREATE TABLE billing_coupon_redemptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id   UUID NOT NULL REFERENCES billing_coupons(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ledger_id   UUID NOT NULL REFERENCES billing_ledger(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_billing_coupon_redemption_user UNIQUE (coupon_id, user_id)
);

CREATE INDEX idx_billing_coupon_redemptions_coupon ON billing_coupon_redemptions(coupon_id);

ALTER TABLE billing_ledger
    ADD CONSTRAINT fk_billing_ledger_coupon
        FOREIGN KEY (coupon_id) REFERENCES billing_coupons(id) ON DELETE SET NULL;
