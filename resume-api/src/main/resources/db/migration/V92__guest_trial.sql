-- 게스트 체험: 가입 없이 AI 기능을 제한 횟수만큼 사용

CREATE TABLE guest_trials (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id    VARCHAR(64) NOT NULL UNIQUE,
    ip          VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    converted   BOOLEAN NOT NULL DEFAULT FALSE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_guest_trials_ip_created ON guest_trials(ip, created_at);

CREATE TABLE guest_trial_uses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id    VARCHAR(64) NOT NULL REFERENCES guest_trials(guest_id) ON DELETE CASCADE,
    operation   VARCHAR(40) NOT NULL,
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_trial_uses_guest ON guest_trial_uses(guest_id);
