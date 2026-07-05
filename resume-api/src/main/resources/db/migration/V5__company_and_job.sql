CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL UNIQUE,
    core_values     JSONB DEFAULT '[]',
    talent_profile  JSONB DEFAULT '[]',
    tech_stack      JSONB DEFAULT '[]',
    culture         TEXT,
    hiring_keywords JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_postings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id      UUID REFERENCES companies(id),
    title           VARCHAR(300),
    source_type     VARCHAR(20) NOT NULL,
    source_url      VARCHAR(1000),
    raw_content     TEXT,
    parsed_json     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_posting_id  UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    company_name    VARCHAR(200),
    position        VARCHAR(200),
    required_skills JSONB DEFAULT '[]',
    preferred_skills JSONB DEFAULT '[]',
    talent_profile  JSONB DEFAULT '[]',
    core_competencies JSONB DEFAULT '[]',
    tech_keywords   JSONB DEFAULT '[]',
    job_description TEXT,
    org_culture     TEXT,
    fit_score       DECIMAL(5,2),
    analysis_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_postings_user_id ON job_postings(user_id);
CREATE INDEX idx_job_analyses_job_posting_id ON job_analyses(job_posting_id);
