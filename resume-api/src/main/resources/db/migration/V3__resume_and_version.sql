CREATE TABLE resumes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    company_name VARCHAR(200),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resume_versions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id           UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    version_number      INTEGER NOT NULL,
    content             TEXT NOT NULL,
    metadata            JSONB DEFAULT '{}',
    parent_version_id   UUID REFERENCES resume_versions(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resume_version UNIQUE (resume_id, version_number)
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);
