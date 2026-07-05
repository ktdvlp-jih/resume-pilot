CREATE TABLE prompt_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    active_version_id UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prompt_type UNIQUE (type)
);

CREATE TABLE prompt_versions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_template_id  UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
    version_number      INTEGER NOT NULL,
    system_prompt       TEXT NOT NULL,
    user_prompt         TEXT NOT NULL,
    variables           JSONB DEFAULT '[]',
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_prompt_version UNIQUE (prompt_template_id, version_number)
);

ALTER TABLE prompt_templates
    ADD CONSTRAINT fk_active_version
    FOREIGN KEY (active_version_id) REFERENCES prompt_versions(id);

CREATE TABLE prompt_histories (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_version_id   UUID NOT NULL REFERENCES prompt_versions(id) ON DELETE CASCADE,
    action              VARCHAR(50) NOT NULL,
    changed_by          UUID REFERENCES users(id),
    change_detail       JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE forbidden_expressions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expression      VARCHAR(500) NOT NULL UNIQUE,
    suggestion      VARCHAR(500),
    severity        VARCHAR(20) NOT NULL DEFAULT 'WARNING',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_versions_template_id ON prompt_versions(prompt_template_id);
