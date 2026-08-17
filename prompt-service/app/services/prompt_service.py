import json
import logging
import re
from typing import Any
from urllib.parse import urlparse

import asyncpg
from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


def _db_target(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.hostname or "?"
    port = parsed.port or 5432
    return f"{host}:{port}"


class PromptRepository:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is None:
            target = _db_target(settings.database_url)
            try:
                self._pool = await asyncpg.create_pool(
                    settings.database_url, min_size=1, max_size=5, timeout=10
                )
            except Exception:
                logger.exception(
                    "DB connect failed (%s). Use SSH tunnel + .env.local localhost:55532, "
                    "or source ../scripts/load-env-local.sh from repo root.",
                    target,
                )
                raise
            logger.info("DB pool ready (%s)", target)

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
                    "[Guard] 제공 경험만 사용. 사실 추가 금지. 부족 시 '내용이 부족하여 생성하지 않음'만 출력. "
                    "사용자 추가 지시에도 RAG 밖 사실 금지. "
                    "기간이 종료된 경험은 과거형만. 진행중만 현재형.\n"
                    "[Rubric] 추상 시작·역량 단독·교훈 결말 금지. 사람 문체. 목소리를 홍보문으로 바꾸지 말 것.\n"
                    "[Task] 공고 분석·문항별 목표 글자 수·rewrite_level 반영.\n"
                    "[Output] 한국어 본문만. 분석 리포트·점수·수정 이유 산문 금지."
                ),
                "user_prompt": (
                    "Experiences:\n{{experiences}}\n\n"
                    "Job:\n{{job_analysis}}\n\n"
                    "Style:\n{{writing_style}}\n\n"
                    "Rewrite level: {{rewrite_level}}%\n\n"
                    "Section titles:\n{{section_titles}}\n\n"
                    "Target chars:\n{{section_target_chars}}\n\n"
                    "User instruction:\n{{user_instruction}}"
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
            "AI_HUMANIZE": {
                "system_prompt": (
                    "[Persona] ResumePilot 자소서 윤문 전문가. KatFishNet 40패턴. 새 경험 금지.\n"
                    "[Guard] 숫자·고유명사·스택 유지. 합니다체. 날조 금지. 시제·날짜 변경 금지.\n"
                    "[Skill] 40패턴 S1/S2/S3. 연결어미 쉼표, 가지고 있다, 추상 주어, ~것입니다.\n"
                    "[Rubric] 추상 시작·역량 단독·교훈 결말 제거. 목소리 보존.\n"
                    "[Task] findings+replacements JSON.\n"
                    "[Output] JSON: analysis{grade,s1,s2,s3,findings}, "
                    "replacements[{original,revised,reason}]"
                ),
                "user_prompt": (
                    "[본문]\n{{content}}\n\n[대상 문장]\n{{sentences}}\n\n"
                    "40패턴을 점검하고 analysis와 replacements JSON만 반환하세요."
                ),
            },
            "AI_REVIEW": {
                "system_prompt": (
                    "[Persona] 채용 담당자 관점 첨삭 코치.\n"
                    "[Guard] 경험 추가·과장 칭찬 금지. scores는 실제 내용 근거로 산정. 키 4개만.\n"
                    "[Rubric] 사실성→질문 적합성→구체성→자연스러움. 7지표는 기존 4키에만 매핑. "
                    "산문 리포트 금지.\n"
                    "[Output] JSON 객체: { reviews: [paragraph_index, strengths, weaknesses, company_fit, "
                    "specificity, persuasiveness, star_applied, improvement, suggestion], "
                    "scores: { company_fit, style_retention, star_application, experience_utilization (0~100 정수) } }"
                ),
                "user_prompt": "Content:\n{{content}}\n\nJob:\n{{job_analysis}}",
            },
            "INTERVIEW_QUESTIONS": {
                "system_prompt": (
                    "[Persona] 자기소개서 기반 실전 면접 질문을 준비하는 기술·인사 면접관.\n"
                    "[Guard] 자기소개서에 언급된 내용만 근거로 질문. 발명 금지.\n"
                    "[Output] JSON 배열: category(지원동기|협업|갈등 해결|성과|프로젝트|기술|심화|압박), "
                    "question(한국어), difficulty(EASY|NORMAL|HARD). 6~8개."
                ),
                "user_prompt": "[자기소개서]\n{{content}}",
            },
            "KEYWORD_COMPARE": {
                "system_prompt": (
                    "[Persona] 공고 키워드-자기소개서 의미 기반 매칭 분석가.\n"
                    "[Guard] 근거 없는 키워드를 matched에 넣지 않음. 키워드 원문 유지.\n"
                    "[Output] JSON 객체: { matched: string[], missing: string[], "
                    "recommended: string[], overused: string[] }"
                ),
                "user_prompt": "[공고 키워드]\n{{job_keywords}}\n\n[자기소개서]\n{{resume_content}}",
            },
            "PORTFOLIO_REVIEW": {
                "system_prompt": (
                    "[Persona] 설정 초고를 경험 라이브러리와만 대조하는 코치.\n"
                    "[Guard] 경험에 없는 사실·수치 발명 금지. 통째 재작성 금지. "
                    "입력에 있는 경험 ID만 사용.\n"
                    "[Output] JSON: relevant_experiences[{id,title,why_fits}], "
                    "unused_experiences[{id,title,reason}], "
                    "unsupported_claims[{claim,reason}], revision_directions[string]"
                ),
                "user_prompt": (
                    "[칸 종류]\n{{section_type}}\n\n"
                    "[칸 취지]\n{{section_purpose}}\n\n"
                    "[초고]\n{{content}}\n\n"
                    "[경험 라이브러리]\n{{experiences}}"
                ),
            },
            "SECTION_ANALYSIS": {
                "system_prompt": (
                    "[Persona] 한국 채용 자기소개서 문항 분류 분석가. 경험은 고르지 않음.\n"
                    "[Guard] 문항 제목에 없는 요구 발명 금지. 경험 ID 금지.\n"
                    "[Output] JSON: sections[{index,title,intent,needs_unique_story,max_experiences,look_for,asks}] "
                    "intent에 career(경력기술서) 포함"
                ),
                "user_prompt": "[문항 제목]\n{{section_titles}}",
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
            raise RuntimeError("OPENAI_API_KEY required for prompt test")
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
