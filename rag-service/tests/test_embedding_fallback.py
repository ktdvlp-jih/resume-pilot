import pytest

from app.services.embedding_service import EmbeddingService


def test_embed_hash_fallback_when_client_missing(monkeypatch):
    monkeypatch.setattr("app.services.embedding_service.settings.openai_api_key", "")
    service = EmbeddingService()
    vec = service.embed("Spring Boot API development")
    assert len(vec) > 0


def test_embed_hash_fallback_on_api_error(monkeypatch):
    class BrokenClient:
        class embeddings:
            @staticmethod
            def create(**_kwargs):
                raise RuntimeError("embedding model not supported")

    service = EmbeddingService()
    service._client = BrokenClient()
    vec = service.embed("Java Spring PostgreSQL")
    assert len(vec) > 0
