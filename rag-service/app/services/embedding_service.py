import hashlib
import logging
from typing import Any

import numpy as np
from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self) -> None:
        if settings.openai_api_key:
            kwargs: dict = {"api_key": settings.openai_api_key}
            if settings.openai_base_url:
                kwargs["base_url"] = settings.openai_base_url
            self._client = OpenAI(**kwargs)
        else:
            self._client = None

    def embed(self, text: str) -> list[float]:
        if self._client:
            try:
                response = self._client.embeddings.create(
                    model=settings.embedding_model,
                    input=text,
                    dimensions=settings.embedding_dimension,
                )
                return self._ensure_dimension(response.data[0].embedding)
            except Exception as exc:
                logger.warning("Embedding API call with dimensions failed (%s), retrying raw embedding", exc)
                try:
                    response = self._client.embeddings.create(
                        model=settings.embedding_model,
                        input=text,
                    )
                    return self._ensure_dimension(response.data[0].embedding)
                except Exception as retry_exc:
                    logger.warning("Embedding API failed (%s), using hash fallback", retry_exc)
        return self._hash_fallback(text)

    def _ensure_dimension(self, vector: list[float]) -> list[float]:
        target = settings.embedding_dimension
        current = len(vector)
        if current == target:
            return vector
        if current > target:
            return vector[:target]
        # Pad shorter vectors defensively to keep pgvector dimension invariant.
        return vector + [0.0] * (target - current)

    def _hash_fallback(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        rng = np.random.default_rng(int.from_bytes(digest[:8], "big"))
        vec = rng.standard_normal(settings.embedding_dimension)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()
