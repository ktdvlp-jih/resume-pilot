-- 토스페이먼츠 연동 키 + 토큰/횟수 과금

CREATE TABLE integration_configs (
    key               VARCHAR(100) PRIMARY KEY,
    value_ciphertext  TEXT,
    is_secret         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO integration_configs (key, value_ciphertext, is_secret) VALUES
('TOSS_PAYMENTS_CLIENT_KEY', NULL, FALSE),
('TOSS_PAYMENTS_SECRET_KEY', NULL, TRUE);

CREATE TABLE billing_products (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(120) NOT NULL,
    kind          VARCHAR(20) NOT NULL,
    operation     VARCHAR(50),
    grant_amount  INT NOT NULL,
    price_krw     INT NOT NULL,
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_billing_products_kind CHECK (kind IN ('TOKEN', 'COUNT')),
    CONSTRAINT chk_billing_products_grant CHECK (grant_amount > 0),
    CONSTRAINT chk_billing_products_price CHECK (price_krw >= 0),
    CONSTRAINT chk_billing_products_count_op CHECK (
        (kind = 'TOKEN' AND operation IS NULL) OR
        (kind = 'COUNT' AND operation IS NOT NULL)
    )
);

CREATE TABLE billing_operation_costs (
    operation   VARCHAR(50) PRIMARY KEY,
    token_cost  INT NOT NULL,
    CONSTRAINT chk_billing_op_cost CHECK (token_cost >= 0)
);

INSERT INTO billing_operation_costs (operation, token_cost) VALUES
('GENERATE', 50),
('JOB_ANALYSIS', 20),
('AI_REVIEW', 20),
('AI_HUMANIZE', 15),
('INTERVIEW_QUESTIONS', 20),
('PORTFOLIO_REVIEW', 20),
('AI_DETECTION', 10),
('KEYWORD_COMPARE', 10),
('SECTION_ANALYSIS', 10);

INSERT INTO billing_products (id, name, kind, operation, grant_amount, price_krw, enabled, sort_order) VALUES
('e0000001-0001-0001-0001-000000000001', '토큰 100', 'TOKEN', NULL, 100, 1000, TRUE, 10),
('e0000001-0001-0001-0001-000000000002', '토큰 500', 'TOKEN', NULL, 500, 4500, TRUE, 20),
('e0000001-0001-0001-0001-000000000003', '토큰 1000', 'TOKEN', NULL, 1000, 8000, TRUE, 30),
('e0000001-0001-0001-0001-000000000004', '자소서 생성 10회', 'COUNT', 'GENERATE', 10, 3000, TRUE, 40),
('e0000001-0001-0001-0001-000000000005', 'AI 첨삭 10회', 'COUNT', 'AI_REVIEW', 10, 2000, TRUE, 50);

CREATE TABLE payment_orders (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id      VARCHAR(120) NOT NULL UNIQUE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id    UUID NOT NULL REFERENCES billing_products(id),
    amount_krw    INT NOT NULL,
    order_name    VARCHAR(200) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_payment_orders_status CHECK (status IN ('PENDING', 'CONSUMED', 'EXPIRED'))
);

CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_expires ON payment_orders(expires_at) WHERE status = 'PENDING';

CREATE TABLE payments (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id            UUID NOT NULL REFERENCES billing_products(id),
    order_id              VARCHAR(120) NOT NULL UNIQUE,
    payment_key           VARCHAR(200) NOT NULL,
    amount_krw            INT NOT NULL,
    refunded_amount_krw   INT NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at          TIMESTAMPTZ,
    CONSTRAINT chk_payments_status CHECK (status IN ('COMPLETED', 'CANCELLED', 'PARTIAL_CANCELLED'))
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

CREATE TABLE entitlement_lots (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id        UUID REFERENCES payments(id) ON DELETE SET NULL,
    kind              VARCHAR(20) NOT NULL,
    operation         VARCHAR(50),
    remaining         INT NOT NULL,
    original_amount   INT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_entitlement_lots_kind CHECK (kind IN ('TOKEN', 'COUNT')),
    CONSTRAINT chk_entitlement_lots_remaining CHECK (remaining >= 0),
    CONSTRAINT chk_entitlement_lots_original CHECK (original_amount > 0),
    CONSTRAINT chk_entitlement_lots_count_op CHECK (
        (kind = 'TOKEN' AND operation IS NULL) OR
        (kind = 'COUNT' AND operation IS NOT NULL)
    )
);

CREATE INDEX idx_entitlement_lots_user_fifo ON entitlement_lots(user_id, kind, operation, created_at)
    WHERE remaining > 0;

CREATE TABLE billing_ledger (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_type      VARCHAR(30) NOT NULL,
    kind            VARCHAR(20),
    operation       VARCHAR(50),
    amount          INT NOT NULL,
    lot_id          UUID,
    payment_id      UUID,
    needs_manual_fix BOOLEAN NOT NULL DEFAULT FALSE,
    note            VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_billing_ledger_type CHECK (entry_type IN (
        'GRANT', 'CONSUME', 'REFUND', 'CANCEL_RECLAIM', 'ADMIN_GRANT'
    ))
);

CREATE INDEX idx_billing_ledger_user ON billing_ledger(user_id, created_at DESC);
