import json
import re
from typing import Any

import asyncpg
from openai import OpenAI

from app.config import settings


class PromptRepository:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=5)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def get_active_prompt(self, prompt_type: str) -> dict[str, Any] | None:
        await self.connect()
        assert self._pool is not None
        row = await self._pool.fetchrow(
            """
            SELECT pv.id, pv.version_number, pv.system_prompt, pv.user_prompt, pv.variables
            FROM prompt_templates pt
            JOIN prompt_versions pv ON pv.id = pt.active_version_id
            WHERE pt.type = $1
            """,
            prompt_type,
        )
        if not row:
            return self._default_prompt(prompt_type)
        return {
            "id": str(row["id"]),
            "version_number": row["version_number"],
            "system_prompt": row["system_prompt"],
            "user_prompt": row["user_prompt"],
            "variables": json.loads(row["variables"]) if row["variables"] else [],
        }

    async def list_versions(self, prompt_type: str) -> list[dict[str, Any]]:
        await self.connect()
        assert self._pool is not None
        rows = await self._pool.fetch(
            """
            SELECT pv.id, pv.version_number, pv.is_active, pv.created_at
            FROM prompt_templates pt
            JOIN prompt_versions pv ON pv.prompt_template_id = pt.id
            WHERE pt.type = $1
            ORDER BY pv.version_number DESC
            """,
            prompt_type,
        )
        return [
            {
                "id": str(r["id"]),
                "version_number": r["version_number"],
                "is_active": r["is_active"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in rows
        ]

    def _default_prompt(self, prompt_type: str) -> dict[str, Any]:
        defaults = {
            "RESUME_GENERATION": {
                "system_prompt": "You rewrite cover letters using ONLY the user's provided experiences. Never invent new experiences.",
                "user_prompt": "Experiences:\n{{experiences}}\n\nJob:\n{{job_analysis}}\n\nStyle:\n{{writing_style}}\n\nRewrite level: {{rewrite_level}}%",
            },
            "AI_DETECTION": {
                "system_prompt": "Detect AI-generated patterns in Korean cover letter sentences.",
                "user_prompt": "Analyze:\n{{content}}",
            },
            "AI_REVIEW": {
                "system_prompt": "Review cover letter paragraphs for company fit and STAR structure.",
                "user_prompt": "Content:\n{{content}}\n\nJob:\n{{job_analysis}}",
            },
        }
        base = defaults.get(prompt_type, {
            "system_prompt": f"Default system prompt for {prompt_type}",
            "user_prompt": "{{content}}",
        })
        return {
            "id": "default",
            "version_number": 0,
            **base,
            "variables": list(set(re.findall(r"\{\{(\w+)\}\}", base["user_prompt"]))),
        }


class PromptRenderer:
    def render(self, template: str, variables: dict[str, Any]) -> str:
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result


class PromptTestService:
    def __init__(self) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def test(self, system_prompt: str, user_prompt: str) -> str:
        if not self._client:
            return f"[Rule-based test]\nSystem: {system_prompt[:100]}...\nUser: {user_prompt[:200]}..."
        response = self._client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=500,
        )
        return response.choices[0].message.content or ""


prompt_repo = PromptRepository()
prompt_renderer = PromptRenderer()
prompt_test_service = PromptTestService()
