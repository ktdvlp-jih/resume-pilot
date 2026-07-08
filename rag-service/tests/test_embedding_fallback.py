import pytest

from app.services.embedding_service import EmbeddingService


def test_embed_hash_fallback_when_no_routes(monkeypatch):
    monkeypatch.setattr("app.services.embedding_service.settings.openai_api_key", "")
    monkeypatch.setattr(
        "app.services.embedding_service.provider_router.routes_for",
        lambda _op: [],
    )
    monkeypatch.setattr(
        "app.services.embedding_service.provider_router.env_fallback_routes",
        lambda: [],
    )
    service = EmbeddingService()
    vec = service.embed("Spring Boot API development")
    assert len(vec) > 0


def test_embed_hash_fallback_on_api_error(monkeypatch):
    service = EmbeddingService()

    def fail_route(_route, _text):
        raise RuntimeError("embedding model not supported")

    monkeypatch.setattr(service, "_embed_with_route", fail_route)
    monkeypatch.setattr(
        "app.services.embedding_service.provider_router.routes_for",
        lambda _op: [
            type("R", (), {
                "provider_slug": "test",
                "base_url": "",
                "api_key": "k",
                "model_name": "m",
                "priority": 1,
            })(),
        ],
    )
    vec = service.embed("Java Spring PostgreSQL")
    assert len(vec) > 0
