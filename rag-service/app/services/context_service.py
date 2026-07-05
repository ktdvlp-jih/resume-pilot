from typing import Any

from app.schemas import ContextBuildRequest
from app.services.vector_repository import vector_repo

SEARCH_ORDER = ["EXPERIENCE", "RESUME", "WRITING_STYLE", "PROMPT", "REVIEW_RULE"]


class ContextService:
    async def build(self, request: ContextBuildRequest) -> dict[str, Any]:
        query = " ".join(request.keywords)
        context: dict[str, Any] = {
            "experiences": [],
            "resumes": [],
            "writing_styles": [],
            "prompts": [],
            "review_rules": [],
        }

        type_map = {
            "EXPERIENCE": "experiences",
            "RESUME": "resumes",
            "WRITING_STYLE": "writing_styles",
            "PROMPT": "prompts",
            "REVIEW_RULE": "review_rules",
        }

        for entity_type in SEARCH_ORDER:
            results = await vector_repo.search(
                query=query,
                user_id=request.user_id,
                entity_types=[entity_type],
                top_k=request.top_k,
            )
            key = type_map[entity_type]
            for r in results:
                content = await vector_repo.fetch_entity_content(r["entity_type"], r["entity_id"])
                context[key].append({
                    "entity_id": r["entity_id"],
                    "score": r["score"],
                    "content": content,
                    "metadata": r["metadata"],
                })

        return {"query": query, "context": context, "job_analysis": request.job_analysis}


context_service = ContextService()
