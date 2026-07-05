import json
import uuid
from typing import Any

import asyncpg

from app.config import settings
from app.services.embedding_service import EmbeddingService


class VectorRepository:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None
        self._embedder = EmbeddingService()

    async def connect(self) -> None:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def upsert_embedding(
        self,
        user_id: str | None,
        entity_type: str,
        entity_id: str,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        await self.connect()
        assert self._pool is not None
        embedding = self._embedder.embed(text)
        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
        meta_json = json.dumps(metadata or {})

        row = await self._pool.fetchrow(
            """
            INSERT INTO vector_embeddings (user_id, entity_type, entity_id, embedding, metadata)
            VALUES ($1::uuid, $2, $3::uuid, $4::vector, $5::jsonb)
            ON CONFLICT (entity_type, entity_id)
            DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata, updated_at = NOW()
            RETURNING id, entity_type, entity_id
            """,
            uuid.UUID(user_id) if user_id else None,
            entity_type,
            uuid.UUID(entity_id),
            embedding_str,
            meta_json,
        )
        return {"id": str(row["id"]), "entity_type": row["entity_type"], "entity_id": str(row["entity_id"])}

    async def search(
        self,
        query: str,
        user_id: str | None = None,
        entity_types: list[str] | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        await self.connect()
        assert self._pool is not None
        embedding = self._embedder.embed(query)
        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

        conditions = ["1=1"]
        params: list[Any] = [embedding_str, top_k]
        idx = 3

        if user_id:
            conditions.append(f"user_id = ${idx}::uuid")
            params.append(uuid.UUID(user_id))
            idx += 1

        if entity_types:
            conditions.append(f"entity_type = ANY(${idx})")
            params.append(entity_types)
            idx += 1

        where = " AND ".join(conditions)
        rows = await self._pool.fetch(
            f"""
            SELECT entity_type, entity_id, metadata,
                   1 - (embedding <=> $1::vector) AS score
            FROM vector_embeddings
            WHERE {where}
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            *params,
        )
        return [
            {
                "entity_type": r["entity_type"],
                "entity_id": str(r["entity_id"]),
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
                "score": float(r["score"]),
            }
            for r in rows
        ]

    async def fetch_entity_content(self, entity_type: str, entity_id: str) -> str | None:
        await self.connect()
        assert self._pool is not None
        eid = uuid.UUID(entity_id)

        if entity_type == "EXPERIENCE":
            row = await self._pool.fetchrow(
                "SELECT title, description, role, result, star_action FROM experiences WHERE id = $1",
                eid,
            )
            if row:
                return "\n".join(filter(None, [row["title"], row["description"], row["role"], row["result"], row["star_action"]]))
        elif entity_type == "RESUME":
            row = await self._pool.fetchrow("SELECT content FROM resume_versions WHERE id = $1", eid)
            if row:
                return row["content"]
        return None


vector_repo = VectorRepository()
