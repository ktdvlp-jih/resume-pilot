CREATE TABLE ai_generations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id           UUID REFERENCES resumes(id),
    job_posting_id      UUID REFERENCES job_postings(id),
    rewrite_level       INTEGER NOT NULL DEFAULT 40 CHECK (rewrite_level BETWEEN 0 AND 100),
    input_context       JSONB DEFAULT '{}',
    output_content      TEXT,
    quality_scores      JSONB DEFAULT '{}',
    experience_ids      JSONB DEFAULT '[]',
    status              VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id       UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    resume_version_id   UUID REFERENCES resume_versions(id),
    paragraph_index     INTEGER NOT NULL,
    strengths           JSONB DEFAULT '[]',
    weaknesses          JSONB DEFAULT '[]',
    company_fit         TEXT,
    specificity         TEXT,
    persuasiveness      TEXT,
    star_applied        BOOLEAN DEFAULT FALSE,
    improvement         TEXT,
    suggestion          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_detections (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id       UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    sentence_index      INTEGER NOT NULL,
    sentence            TEXT NOT NULL,
    level               VARCHAR(20) NOT NULL CHECK (level IN ('GREEN', 'YELLOW', 'RED')),
    reason              TEXT,
    suggestion          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_questions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id       UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    category            VARCHAR(50) NOT NULL,
    question            TEXT NOT NULL,
    difficulty          VARCHAR(20) DEFAULT 'NORMAL',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feedbacks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id       UUID REFERENCES ai_generations(id),
    rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_reviews_generation_id ON ai_reviews(generation_id);
CREATE INDEX idx_ai_detections_generation_id ON ai_detections(generation_id);
