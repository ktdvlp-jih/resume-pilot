from typing import Any

from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    user_id: str | None = None
    entity_type: str
    entity_id: str
    text: str
    metadata: dict[str, Any] | None = None


class SearchRequest(BaseModel):
    query: str
    user_id: str | None = None
    entity_types: list[str] | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class ContextBuildRequest(BaseModel):
    user_id: str
    keywords: list[str]
    job_analysis: dict[str, Any] | None = None
    top_k: int = Field(default=5, ge=1, le=20)
