CREATE TABLE experiences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    role            VARCHAR(200),
    contribution    TEXT,
    result          TEXT,
    numeric_result  VARCHAR(200),
    star_situation  TEXT,
    star_task       TEXT,
    star_action     TEXT,
    star_result     TEXT,
    skills          JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id   UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    name            VARCHAR(300) NOT NULL,
    tech_stack      JSONB DEFAULT '[]',
    team_size       INTEGER,
    duration        VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE careers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id   UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    company         VARCHAR(200) NOT NULL,
    department      VARCHAR(200),
    position        VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id   UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    metric          VARCHAR(200),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiences_user_id ON experiences(user_id);
CREATE INDEX idx_experiences_type ON experiences(type);
