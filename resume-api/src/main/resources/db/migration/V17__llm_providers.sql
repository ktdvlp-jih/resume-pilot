CREATE TABLE llm_providers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    provider_type   VARCHAR(30) NOT NULL DEFAULT 'OPENAI_COMPAT',
    base_url        VARCHAR(500),
    api_key_ciphertext TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE llm_model_routes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation       VARCHAR(50) NOT NULL,
    provider_id     UUID NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE,
    model_name      VARCHAR(100) NOT NULL,
    priority        INTEGER NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_llm_route_operation_priority UNIQUE (operation, priority)
);

CREATE INDEX idx_llm_model_routes_operation ON llm_model_routes(operation);

-- Provider slots (keys are set via Admin; enabled after key is configured)
INSERT INTO llm_providers (id, slug, display_name, provider_type, base_url, enabled) VALUES
('c0000001-0001-0001-0001-000000000001', 'gemini', 'Google Gemini', 'OPENAI_COMPAT',
 'https://generativelanguage.googleapis.com/v1beta/openai/', false),
('c0000001-0001-0001-0001-000000000002', 'openai', 'OpenAI', 'OPENAI_COMPAT',
 'https://api.openai.com/v1', false),
('c0000001-0001-0001-0001-000000000003', 'groq', 'Groq', 'OPENAI_COMPAT',
 'https://api.groq.com/openai/v1', false),
('c0000001-0001-0001-0001-000000000004', 'openrouter', 'OpenRouter', 'OPENAI_COMPAT',
 'https://openrouter.ai/api/v1', false),
('c0000001-0001-0001-0001-000000000005', 'github', 'GitHub Models', 'OPENAI_COMPAT',
 'https://models.github.ai/inference', false);

-- Default failover chains (priority 1 → primary, 2+ → fallback)
INSERT INTO llm_model_routes (id, operation, provider_id, model_name, priority, enabled) VALUES
-- GENERATE
('d0000001-0001-0001-0001-000000000001', 'GENERATE', 'c0000001-0001-0001-0001-000000000001', 'gemini-2.5-flash', 1, true),
('d0000001-0001-0001-0001-000000000002', 'GENERATE', 'c0000001-0001-0001-0001-000000000002', 'gpt-4o-mini', 2, true),
('d0000001-0001-0001-0001-000000000004', 'GENERATE', 'c0000001-0001-0001-0001-000000000005', 'openai/gpt-4o-mini', 3, true),
('d0000001-0001-0001-0001-000000000003', 'GENERATE', 'c0000001-0001-0001-0001-000000000004', 'google/gemini-2.5-flash', 4, true),
-- JOB_ANALYSIS
('d0000002-0001-0001-0001-000000000001', 'JOB_ANALYSIS', 'c0000001-0001-0001-0001-000000000001', 'gemini-2.5-flash', 1, true),
('d0000002-0001-0001-0001-000000000002', 'JOB_ANALYSIS', 'c0000001-0001-0001-0001-000000000002', 'gpt-4o-mini', 2, true),
('d0000002-0001-0001-0001-000000000004', 'JOB_ANALYSIS', 'c0000001-0001-0001-0001-000000000005', 'openai/gpt-4o-mini', 3, true),
('d0000002-0001-0001-0001-000000000003', 'JOB_ANALYSIS', 'c0000001-0001-0001-0001-000000000003', 'llama-3.3-70b-versatile', 4, true),
-- AI_DETECTION
('d0000003-0001-0001-0001-000000000001', 'AI_DETECTION', 'c0000001-0001-0001-0001-000000000001', 'gemini-2.5-flash', 1, true),
('d0000003-0001-0001-0001-000000000002', 'AI_DETECTION', 'c0000001-0001-0001-0001-000000000002', 'gpt-4o-mini', 2, true),
('d0000003-0001-0001-0001-000000000003', 'AI_DETECTION', 'c0000001-0001-0001-0001-000000000005', 'openai/gpt-4o-mini', 3, true),
-- AI_REVIEW
('d0000004-0001-0001-0001-000000000001', 'AI_REVIEW', 'c0000001-0001-0001-0001-000000000001', 'gemini-2.5-flash', 1, true),
('d0000004-0001-0001-0001-000000000002', 'AI_REVIEW', 'c0000001-0001-0001-0001-000000000002', 'gpt-4o-mini', 2, true),
('d0000004-0001-0001-0001-000000000003', 'AI_REVIEW', 'c0000001-0001-0001-0001-000000000005', 'openai/gpt-4o-mini', 3, true),
-- EMBEDDING (rag-service)
('d0000005-0001-0001-0001-000000000001', 'EMBEDDING', 'c0000001-0001-0001-0001-000000000001', 'gemini-embedding-001', 1, true),
('d0000005-0001-0001-0001-000000000002', 'EMBEDDING', 'c0000001-0001-0001-0001-000000000002', 'text-embedding-3-small', 2, true);
