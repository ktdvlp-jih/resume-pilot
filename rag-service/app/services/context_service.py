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

        # 사용자가 화면에서 직접 선택한 경험은 키워드 검색 결과와 무관하게 항상 포함시킨다.
        selected_ids: set[str] = set(request.experience_ids)
        for entity_id in request.experience_ids:
            content = await vector_repo.fetch_entity_content("EXPERIENCE", entity_id)
            if content is None:
                continue
            context["experiences"].append({
                "entity_id": entity_id,
                "score": 1.0,
                "content": content,
                "metadata": {"selected": True},
            })

        for entity_type in SEARCH_ORDER:
            if entity_type == "EXPERIENCE":
                # 사용자가 명시적으로 경험을 선택했다면 그 선택만 사용하고 자동 검색으로 채우지 않는다.
                remaining = 0 if selected_ids else request.top_k
            else:
                remaining = request.top_k
            if remaining <= 0:
                continue
            results = await vector_repo.search(
                query=query,
                user_id=request.user_id,
                entity_types=[entity_type],
                top_k=remaining,
            )
            key = type_map[entity_type]
            for r in results:
                if entity_type == "EXPERIENCE" and r["entity_id"] in selected_ids:
                    continue
                content = await vector_repo.fetch_entity_content(r["entity_type"], r["entity_id"])
                context[key].append({
                    "entity_id": r["entity_id"],
                    "score": r["score"],
                    "content": content,
                    "metadata": r["metadata"],
                })

        return {"query": query, "context": context, "job_analysis": request.job_analysis}


context_service = ContextService()
