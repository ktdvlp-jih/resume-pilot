import hashlib
import logging
from typing import Any

import numpy as np
from openai import OpenAI

from app.config import settings
from app.services.provider_router import EMBEDDING_OPERATION, LlmRoute, provider_router

logger = logging.getLogger(__name__)


class EmbeddingService:
    def embed(self, text: str) -> list[float]:
        routes = provider_router.routes_for(EMBEDDING_OPERATION)
        if not routes:
            routes = provider_router.env_fallback_routes()

        last_error: Exception | None = None
        for route in routes:
            try:
                return self._embed_with_route(route, text)
            except Exception as exc:
                logger.warning(
                    "Embedding route failed (%s / %s): %s",
                    route.provider_slug,
                    route.model_name,
                    exc,
                )
                last_error = exc

        if last_error:
            logger.warning("All embedding routes failed, using hash fallback: %s", last_error)
        return self._hash_fallback(text)

    def _embed_with_route(self, route: LlmRoute, text: str) -> list[float]:
        kwargs: dict[str, str] = {"api_key": route.api_key}
        if route.base_url:
            kwargs["base_url"] = route.base_url
        client = OpenAI(**kwargs)
        try:
            response = client.embeddings.create(
                model=route.model_name,
                input=text,
                dimensions=settings.embedding_dimension,
            )
            return self._ensure_dimension(response.data[0].embedding)
        except Exception as exc:
            if settings.embedding_dimension <= 0:
                raise
            logger.warning(
                "Embedding with dimensions failed (%s), retrying raw embedding",
                exc,
            )
            response = client.embeddings.create(
                model=route.model_name,
                input=text,
            )
            return self._ensure_dimension(response.data[0].embedding)

    def _ensure_dimension(self, vector: list[float]) -> list[float]:
        target = settings.embedding_dimension
        current = len(vector)
        if current == target:
            return vector
        if current > target:
            return vector[:target]
        return vector + [0.0] * (target - current)

    def _hash_fallback(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        rng = np.random.default_rng(int.from_bytes(digest[:8], "big"))
        vec = rng.standard_normal(settings.embedding_dimension)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()


embedding_service = EmbeddingService()
