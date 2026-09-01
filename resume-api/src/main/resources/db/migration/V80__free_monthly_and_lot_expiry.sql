-- Free 월 체험: 로트 source/만료 + 지급 기간 기록

ALTER TABLE entitlement_lots
    ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'PURCHASE',
    ADD COLUMN expires_at TIMESTAMPTZ;

ALTER TABLE entitlement_lots
    ADD CONSTRAINT chk_entitlement_lots_source CHECK (source IN ('PURCHASE', 'ADMIN', 'FREE_MONTHLY'));

CREATE INDEX idx_entitlement_lots_expires
    ON entitlement_lots (expires_at)
    WHERE remaining > 0 AND expires_at IS NOT NULL;

ALTER TABLE billing_ledger
    DROP CONSTRAINT chk_billing_ledger_type;

ALTER TABLE billing_ledger
    ADD CONSTRAINT chk_billing_ledger_type CHECK (entry_type IN (
        'GRANT', 'CONSUME', 'REFUND', 'CANCEL_RECLAIM', 'ADMIN_GRANT', 'FREE_GRANT'
    ));

CREATE TABLE free_allowance_grants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_key  VARCHAR(7) NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_free_allowance_user_period UNIQUE (user_id, period_key)
);

CREATE INDEX idx_free_allowance_period ON free_allowance_grants(period_key);

-- 연동: Notion / GitHub 앱 키 (전역)
INSERT INTO integration_configs (key, value_ciphertext, is_secret) VALUES
('NOTION_CLIENT_ID', NULL, FALSE),
('NOTION_CLIENT_SECRET', NULL, TRUE),
('GITHUB_CLIENT_ID', NULL, FALSE),
('GITHUB_CLIENT_SECRET', NULL, TRUE)
ON CONFLICT (key) DO NOTHING;

-- 사용자별 연동 토큰
CREATE TABLE user_integrations (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider          VARCHAR(30) NOT NULL,
    access_token_enc  TEXT,
    refresh_token_enc TEXT,
    external_user_id  VARCHAR(200),
    meta_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_integrations_provider CHECK (provider IN ('NOTION', 'GITHUB')),
    CONSTRAINT uq_user_integrations_user_provider UNIQUE (user_id, provider)
);
