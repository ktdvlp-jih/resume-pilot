import hashlib
from typing import Any

import numpy as np
from openai import OpenAI

from app.config import settings


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
            response = self._client.embeddings.create(
                model=settings.embedding_model,
                input=text,
            )
            return response.data[0].embedding
        return self._hash_fallback(text)

    def _hash_fallback(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        rng = np.random.default_rng(int.from_bytes(digest[:8], "big"))
        vec = rng.standard_normal(settings.embedding_dimension)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()
