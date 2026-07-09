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
                "system_prompt": (
                    "[Persona] 한국 취업 시장 자기소개서 코치.\n"
                    "[Guard] 제공 경험만 사용. 사실 추가 금지. 부족 시 '내용이 부족하여 생성하지 않음'만 출력.\n"
                    "[Task] 공고 분석·STAR·rewrite_level 반영.\n"
                    "[Output] 한국어 본문만."
                ),
                "user_prompt": (
                    "Experiences:\n{{experiences}}\n\n"
                    "Job:\n{{job_analysis}}\n\n"
                    "Style:\n{{writing_style}}\n\n"
                    "Rewrite level: {{rewrite_level}}%"
                ),
            },
            "JOB_ANALYSIS": {
                "system_prompt": (
                    "[Persona] 채용공고 섹션 단위 구조화 분석가 (텍스트/URL/PDF/이미지·OCR). "
                    "데이터 일관성·교차 중복 최소화.\n"
                    "[Guard] 공고에 없는 정보 발명 금지. 섹션 헤더 기준으로 필드 분리. "
                    "주요업무→job_responsibilities, 지원자격/필수→required_skills, "
                    "우대/우대요건→preferred_skills, 학력·경력연수·자격증→qualifications. "
                    "동일 bullet을 두 필드에 넣지 마세요. tech_keywords는 스택·dr.* 토큰만. "
                    "job_description은 요약만.\n"
                    "[Output] JSON only: company_name, position, qualifications, required_skills, "
                    "preferred_skills, tech_keywords, job_responsibilities, talent_profile, "
                    "core_competencies, org_culture, job_description"
                ),
                "user_prompt": (
                    "다음 채용공고를 분석하세요. 섹션 헤더별로 필드를 정확히 나누고, "
                    "bullet 중복을 피하세요. 우대 섹션이 있으면 preferred_skills를 채우세요.\n\n"
                    "{{content}}"
                ),
            },
            "AI_DETECTION": {
                "system_prompt": (
                    "[Persona] AI 흔적 문장 분석가.\n"
                    "[Guard] 보수적 판정. 금지 표현 포함 시 RED.\n"
                    "[Output] JSON 배열: sentence_index, sentence, level, reason, suggestion"
                ),
                "user_prompt": "Analyze:\n{{content}}\n\n{{forbidden_expressions}}",
            },
            "AI_REVIEW": {
                "system_prompt": (
                    "[Persona] 채용 담당자 관점 첨삭 코치.\n"
                    "[Guard] 경험 추가·과장 칭찬 금지.\n"
                    "[Output] JSON 배열: paragraph_index, strengths, weaknesses, company_fit, "
                    "specificity, persuasiveness, star_applied, improvement, suggestion"
                ),
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
