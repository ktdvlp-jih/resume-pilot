import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_OPERATION = "EMBEDDING"


@dataclass(frozen=True)
class LlmRoute:
    provider_slug: str
    base_url: str
    api_key: str
    model_name: str
    priority: int


class ProviderRouter:
    def __init__(self) -> None:
        self._cache: dict[str, list[LlmRoute]] = {}
        self._loaded_at = 0.0
        self._ttl_seconds = 60

    def routes_for(self, operation: str) -> list[LlmRoute]:
        self._ensure_loaded()
        return list(self._cache.get(operation, []))

    def env_fallback_routes(self) -> list[LlmRoute]:
        if not settings.openai_api_key:
            return []
        return [
            LlmRoute(
                provider_slug="env",
                base_url=settings.openai_base_url or "https://api.openai.com/v1",
                api_key=settings.openai_api_key,
                model_name=settings.embedding_model,
                priority=1,
            )
        ]

    def _ensure_loaded(self) -> None:
        if time.time() - self._loaded_at < self._ttl_seconds and self._cache:
            return
        if not settings.resume_api_url or not settings.internal_api_token:
            self._cache = {}
            self._loaded_at = time.time()
            return
        url = f"{settings.resume_api_url.rstrip('/')}/api/v1/internal/llm/runtime-config"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    url,
                    headers={"X-Internal-Token": settings.internal_api_token},
                )
                response.raise_for_status()
                payload: dict[str, Any] = response.json()["data"]["routes"]
            loaded: dict[str, list[LlmRoute]] = {}
            for operation, items in payload.items():
                loaded[operation] = [
                    LlmRoute(
                        provider_slug=item["providerSlug"],
                        base_url=item.get("baseUrl") or "",
                        api_key=item["apiKey"],
                        model_name=item["modelName"],
                        priority=item.get("priority", 1),
                    )
                    for item in items
                ]
            self._cache = loaded
            self._loaded_at = time.time()
            logger.info("Loaded LLM runtime routes from resume-api")
        except Exception as exc:
            logger.warning("Failed to load LLM routes from resume-api: %s", exc)
            self._cache = {}
            self._loaded_at = time.time()


provider_router = ProviderRouter()
