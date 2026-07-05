CREATE TABLE vector_embeddings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    content_hash    VARCHAR(64),
    embedding       vector(1536) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entity_embedding UNIQUE (entity_type, entity_id)
);

CREATE INDEX idx_vector_embeddings_user_id ON vector_embeddings(user_id);
CREATE INDEX idx_vector_embeddings_entity ON vector_embeddings(entity_type, entity_id);
CREATE INDEX idx_vector_embeddings_hnsw ON vector_embeddings
    USING hnsw (embedding vector_cosine_ops);
