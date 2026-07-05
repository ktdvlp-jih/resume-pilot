CREATE TABLE user_writing_styles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    frequent_words      JSONB DEFAULT '[]',
    avg_sentence_length DECIMAL(6,2),
    uses_formal_speech  BOOLEAN DEFAULT TRUE,
    sentence_style      VARCHAR(100),
    expression_style    TEXT,
    connectors          JSONB DEFAULT '[]',
    tone                VARCHAR(100),
    analysis_json       JSONB DEFAULT '{}',
    source_resume_ids   JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_usage_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    service         VARCHAR(50) NOT NULL,
    operation       VARCHAR(100) NOT NULL,
    model           VARCHAR(100),
    input_tokens    INTEGER DEFAULT 0,
    output_tokens   INTEGER DEFAULT 0,
    duration_ms     INTEGER,
    status          VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id        UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    target_type     VARCHAR(100),
    target_id       UUID,
    detail          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_writing_styles_user_id ON user_writing_styles(user_id);
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
