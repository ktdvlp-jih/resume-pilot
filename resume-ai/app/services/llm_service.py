import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from openai import APIStatusError, RateLimitError

from app.config import settings
from app.services.provider_router import LlmRoute, provider_router

logger = logging.getLogger(__name__)

# 번역투·공허한 마무리 등 AI 특유 문체 패턴
_STYLE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("로 하여금", re.compile(r"로\s*하여금")),
    ("해 주었습니다", re.compile(r"해\s*주었습니다")),
    ("게 해주었습니다", re.compile(r"게\s*해\s*주었습니다")),
    ("하게 만들었습니다", re.compile(r"하게\s*만들었습니다")),
    ("하게 하였습니다", re.compile(r"하게\s*하였습니다")),
    ("되어지", re.compile(r"되어지")),
    ("에 있어서", re.compile(r"에\s*있어서")),
    ("큰 도움이 될 것입니다", re.compile(r"큰\s*도움이\s*될\s*것입니다")),
    ("큰 도움이 되었습니다", re.compile(r"큰\s*도움이\s*되었습니다")),
    ("중요한 자산이 되었습니다", re.compile(r"중요한\s*자산이\s*되었습니다")),
    ("큰 자산이 되었습니다", re.compile(r"큰\s*자산이\s*되었습니다")),
    ("역량을 강화할 수 있었습니다", re.compile(r"역량을\s*강화할\s*수\s*있었습니다")),
    ("기술적 역량을 강화", re.compile(r"기술적\s*역량을\s*강화")),
    ("깨닫게 되었습니다", re.compile(r"깨닫게\s*되었습니다")),
    ("협업의 중요성을 깨달", re.compile(r"협업의\s*중요성을\s*깨달")),
    ("기여하고자 합니다", re.compile(r"기여하고자\s*합니다")),
    ("기여할 수 있을 것입니다", re.compile(r"기여할\s*수\s*있을\s*것입니다")),
    ("배울 수 있었습니다", re.compile(r"배울\s*수\s*있었습니다")),
    ("많은 것을 배웠습니다", re.compile(r"많은\s*것을\s*배웠습니다")),
    ("성장할 수 있었습니다", re.compile(r"성장할\s*수\s*있었습니다")),
    ("깊이 이해하게 되었습니다", re.compile(r"깊이\s*이해하게\s*되었습니다")),
    ("노력하겠습니다", re.compile(r"노력하겠습니다")),
    ("지속적으로 성장", re.compile(r"지속적으로\s*성장")),
    ("경쟁력을 높이겠습니다", re.compile(r"경쟁력을\s*높이겠습니다")),
    ("고객의 요구사항을 반영하여", re.compile(r"고객의\s*요구사항을\s*반영하여")),
    ("앞으로도 새로운 기술을", re.compile(r"앞으로도\s*새로운\s*기술을")),
]
# 문단 내 2회 이상일 때만 위반으로 집계
_REPEAT_PHRASES: list[str] = ["이러한 경험", "이를 통해", "경험을 통해"]
_LEADING_ADVERB_COMMA = re.compile(
    r"(?:^|[.!?]\s*)(또한|특히|이러한|이를\s*통해|더\s*나아가|결국|마지막으로)\s*,"
)
_CONNECTOR_ADVERBS = re.compile(
    r"(?:^|[.!?]\s*| )\b(또한|특히|이러한|이를\s*통해|더\s*나아가|결국|마지막으로)\b"
)


@dataclass(frozen=True)
class LlmCompletion:
    content: str
    model: str | None = None


OPERATION_MAX_TOKENS: dict[str, int] = {
    "JOB_ANALYSIS": 4096,
    # Gemini 2.5 thinking이 max_tokens를 함께 소모해 본문이 잘릴 수 있어 여유를 둠.
    # gpt-4o-mini 등 OpenAI 계열은 completion 상한이 16384라서 그 이상으로 두면 400이 난다.
    "GENERATE": 16384,
    "AI_DETECTION": 8192,
    "AI_REVIEW": 8192,
    "INTERVIEW_QUESTIONS": 4096,
    "KEYWORD_COMPARE": 8192,
}

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)
_JSON_RETRY_SUFFIX = (
    "\n\n[Format] Return raw JSON only. Do not use markdown code fences or add commentary."
)


class LlmService:
    def __init__(self) -> None:
        pass

    @property
    def has_llm(self) -> bool:
        return bool(settings.openai_api_key)

    async def has_routes(self, operation: str) -> bool:
        routes = await self._resolve_routes(operation)
        return len(routes) > 0

    async def complete_for_operation(
        self,
        operation: str,
        system: str,
        user: str,
        temperature: float = 0.7,
    ) -> LlmCompletion:
        routes = await self._resolve_routes(operation)
        if not routes:
            raise RuntimeError(f"LLM routes unavailable for {operation}")

        last_error: Exception | None = None
        for route in routes:
            try:
                content = await self._chat(route, system, user, temperature, operation)
                return LlmCompletion(content=content, model=route.model_name)
            except Exception as exc:
                if not self._is_retryable(exc):
                    raise
                logger.warning(
                    "LLM route failed (%s / %s): %s",
                    route.provider_slug,
                    route.model_name,
                    exc,
                )
                last_error = exc
        if last_error:
            raise RuntimeError(
                f"LLM routes failed for {operation}: {last_error}"
            ) from last_error
        raise RuntimeError(f"LLM routes failed for {operation}")

    async def complete_json_for_operation(
        self,
        operation: str,
        system: str,
        user: str,
        temperature: float = 0.2,
    ) -> tuple[dict[str, Any] | None, str | None]:
        parsed, completion = await self.complete_json_value_for_operation(
            operation, system, user, temperature=temperature,
        )
        if isinstance(parsed, dict):
            return parsed, completion.model
        return None, completion.model

    async def complete_json_value_for_operation(
        self,
        operation: str,
        system: str,
        user: str,
        temperature: float = 0.2,
    ) -> tuple[dict[str, Any] | list[Any] | None, LlmCompletion]:
        """LLM 호출 후 JSON 파싱. 1회 실패 시 포맷 지시를 붙여 재시도한다."""
        completion = await self.complete_for_operation(operation, system, user, temperature=temperature)
        parsed = self.parse_json_value(completion.content)
        if parsed is not None:
            return parsed, completion

        logger.warning(
            "%s JSON parse failed, retrying once. raw=%.300s",
            operation,
            completion.content,
        )
        retry_completion = await self.complete_for_operation(
            operation,
            system + _JSON_RETRY_SUFFIX,
            user + "\n\nRespond with valid JSON only.",
            temperature=temperature,
        )
        parsed = self.parse_json_value(retry_completion.content)
        if parsed is not None:
            return parsed, retry_completion
        return None, retry_completion

    async def complete_with_image_for_operation(
        self,
        operation: str,
        system: str,
        user_text: str,
        image_data_url: str,
        temperature: float = 0.2,
    ) -> LlmCompletion:
        routes = await self._resolve_routes(operation)
        if not routes:
            raise RuntimeError(f"LLM routes unavailable for {operation}")

        last_error: Exception | None = None
        for route in routes:
            try:
                model = self._model_for(route, temperature, operation, default_max_tokens=2048)
                response = await model.ainvoke([
                    SystemMessage(content=system),
                    HumanMessage(content=[
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": image_data_url}},
                    ]),
                ])
                return LlmCompletion(
                    content=self._message_text(response),
                    model=route.model_name,
                )
            except Exception as exc:
                if not self._is_retryable(exc):
                    raise
                logger.warning(
                    "LLM vision route failed (%s / %s): %s",
                    route.provider_slug,
                    route.model_name,
                    exc,
                )
                last_error = exc
        if last_error:
            raise RuntimeError(
                f"LLM vision routes failed for {operation}: {last_error}"
            ) from last_error
        raise RuntimeError(f"LLM vision routes failed for {operation}")

    async def complete_with_image_json_for_operation(
        self,
        operation: str,
        system: str,
        user_text: str,
        image_data_url: str,
        temperature: float = 0.2,
    ) -> tuple[dict[str, Any] | None, str | None]:
        completion = await self.complete_with_image_for_operation(
            operation, system, user_text, image_data_url, temperature=temperature,
        )
        return self.parse_json_response(completion.content), completion.model

    def parse_json_value(self, text: str) -> dict[str, Any] | list[Any] | None:
        """LLM 응답에서 JSON 값을 추출한다. dict와 list(배열 프롬프트 출력) 모두 허용."""
        if not text or not text.strip():
            return None

        candidates: list[str] = [text.strip()]
        for match in _JSON_FENCE_RE.finditer(text):
            block = match.group(1).strip()
            if block:
                candidates.append(block)

        stripped = text.strip()
        if stripped.startswith("```"):
            unwrapped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
            unwrapped = re.sub(r"\s*```\s*$", "", unwrapped)
            candidates.append(unwrapped.strip())

        for candidate in candidates:
            parsed = self._loads_json(candidate)
            if parsed is not None:
                return parsed
            repaired = self._repair_truncated_json(candidate)
            if repaired is not None:
                return repaired

        bracket_positions = [text.find(op) for op in ("[", "{") if text.find(op) >= 0]
        if bracket_positions:
            start = min(bracket_positions)
            parsed = self._loads_json_from_offset(text, start)
            if parsed is not None:
                return parsed
            repaired = self._repair_truncated_json(text[start:])
            if repaired is not None:
                return repaired
        return None

    def _loads_json(self, text: str) -> dict[str, Any] | list[Any] | None:
        try:
            parsed = json.loads(text)
            return parsed if isinstance(parsed, (dict, list)) else None
        except json.JSONDecodeError:
            return None

    def _loads_json_from_offset(self, text: str, start: int) -> dict[str, Any] | list[Any] | None:
        try:
            parsed, _ = json.JSONDecoder().raw_decode(text[start:])
            return parsed if isinstance(parsed, (dict, list)) else None
        except json.JSONDecodeError:
            return None

    def _repair_truncated_json(self, text: str) -> dict[str, Any] | list[Any] | None:
        """토큰 한도로 잘린 JSON을 닫아 부분 복구를 시도한다."""
        if not text or text[0] not in "{[":
            return None

        in_string = False
        escape = False
        stack: list[str] = []
        for ch in text:
            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                continue
            if ch == '"':
                in_string = True
            elif ch in "{[":
                stack.append("}" if ch == "{" else "]")
            elif ch in "}]":
                if stack and stack[-1] == ch:
                    stack.pop()

        repaired = text.rstrip()
        if repaired.endswith(","):
            repaired = repaired[:-1]
        if in_string:
            repaired += '"'
        while stack:
            repaired += stack.pop()

        if repaired == text:
            return None
        return self._loads_json(repaired)

    def parse_json_response(self, text: str) -> dict[str, Any] | None:
        parsed = self.parse_json_value(text)
        return parsed if isinstance(parsed, dict) else None

    async def generate_with_context(
        self,
        experiences: list[dict],
        rewrite_level: int,
        job_analysis: dict | None,
        writing_style: str,
        system_prompt: str,
        user_prompt: str,
        section_titles: list[str] | None = None,
        section_index: int | None = None,
        existing_paragraphs: list[str] | None = None,
    ) -> dict[str, Any]:
        if not experiences:
            return {
                "content": "내용이 부족하여 생성하지 않음",
                "experience_ids": [],
                "insufficient": True,
                "model": None,
                "sections": [],
            }

        exp_text = "\n".join(
            f"- [{e.get('entity_id', 'unknown')}] {e.get('content', '')}"
            for e in experiences if e.get("content")
        )
        if not exp_text.strip():
            return {
                "content": "내용이 부족하여 생성하지 않음",
                "experience_ids": [e.get("entity_id") for e in experiences],
                "insufficient": True,
                "model": None,
                "sections": [],
            }

        titles = [t for t in (section_titles or []) if t][:5]
        section_count = len(titles)

        def _fill_user_prompt(selected: list[dict]) -> str:
            selected_text = "\n".join(
                f"- [{e.get('entity_id', 'unknown')}] {e.get('content', '')}"
                for e in selected
                if e.get("content")
            )
            if not selected_text.strip():
                selected_text = (
                    "(이 문항에 배정된 경험 없음 — 과거 프로젝트를 쓰지 말고 "
                    "문항 초점에 맞게만 작성)"
                )
            msg = user_prompt.replace("{{experiences}}", selected_text)
            msg = msg.replace("{{rewrite_level}}", str(rewrite_level))
            msg = msg.replace("{{writing_style}}", writing_style or "사용자 기본 문체")
            msg = msg.replace("{{job_analysis}}", str(job_analysis or {}))
            msg = msg.replace(
                "{{section_titles}}",
                "\n".join(f"{i + 1}. {t}" for i, t in enumerate(titles)) if titles else "(기본 구성)",
            )
            return msg

        # 비문항 모드도 공고와 약한 경험은 컨텍스트에서 제외
        if section_count == 0:
            experiences_for_msg = self._filter_job_relevant_experiences(experiences, job_analysis)
            user_msg = _fill_user_prompt(experiences_for_msg)
        else:
            user_msg = _fill_user_prompt(experiences)

        try:
            if not await self.has_routes("GENERATE"):
                raise RuntimeError("LLM routes unavailable for GENERATE")

            # 문항 제목이 있으면 문항별로 생성해 문단 수·분량을 맞춘다.
            if section_count > 0:
                content, model_name, sections = await self._generate_by_sections(
                    system_prompt=system_prompt,
                    fill_user_prompt=_fill_user_prompt,
                    experiences=experiences,
                    titles=titles,
                    rewrite_level=rewrite_level,
                    job_analysis=job_analysis,
                    section_index=section_index,
                    existing_paragraphs=existing_paragraphs or [],
                )
                content = self._normalize_section_paragraphs(content, section_count)
                ok_count = sum(1 for s in sections if s.get("status") == "ok" and (s.get("content") or "").strip())
                if ok_count == 0 and section_index is None:
                    raise RuntimeError("All section generations failed")
                if section_index is not None:
                    target = next((s for s in sections if s.get("index") == section_index), None)
                    if not target or target.get("status") != "ok":
                        err = (target or {}).get("error") or "Section generation failed"
                        raise RuntimeError(err)
                return {
                    "content": content,
                    "experience_ids": [e.get("entity_id") for e in experiences if e.get("entity_id")],
                    "insufficient": False,
                    "model": model_name,
                    "sections": sections,
                }

            completion = await self.complete_for_operation("GENERATE", system_prompt, user_msg)
            content = (completion.content or "").strip()
            if self._looks_truncated_resume(
                content,
                experience_count=len(experiences),
                section_count=0,
            ):
                logger.warning(
                    "GENERATE output looks truncated (%s chars), retrying once. tail=%.80s",
                    len(content),
                    content[-80:],
                )
                retry = await self.complete_for_operation(
                    "GENERATE",
                    system_prompt
                    + "\n[Length] Write the FULL cover letter now. "
                    "Each experience paragraph needs clear STAR detail (1000+ Korean chars when possible). "
                    "Do not stop mid-sentence.",
                    user_msg
                    + "\n\n이전 초안이 너무 짧거나 중간에 끊겼습니다. 완성된 전체 자소서를 충분히 길게 다시 작성하세요.",
                    temperature=0.5,
                )
                if len((retry.content or "").strip()) > len(content):
                    completion = retry
                    content = (retry.content or "").strip()
            model_name = completion.model
        except Exception as exc:
            logger.exception("LLM generate failed: %s", exc)
            raise

        return {
            "content": content,
            "experience_ids": [e.get("entity_id") for e in experiences if e.get("entity_id")],
            "insufficient": False,
            "model": model_name,
            "sections": [],
        }

    @staticmethod
    def _rewrite_level_rules(rewrite_level: int) -> str:
        """rewrite_level은 표현 강도만 — 사실·수치·시점은 불변."""
        return (
            f"[Rewrite · 재작성 강도 {rewrite_level}%]\n"
            "- rewrite_level은 표현·문장 구조·어투만 바꿉니다.\n"
            "- 사실·수치·프로젝트명·역할·기술·시점은 RAG(경험)에 있는 그대로 유지합니다.\n"
            "- 입력에 없는 역할·직군 라벨을 붙이지 마세요. 기간이 없으면 즉시성·연속성을 단정하지 마세요.\n"
            "- 100%여도 없는 사실을 만들지 마세요. 100% = 표현 전면 재작성이지 허구 허용이 아닙니다.\n"
            "- 분량보다 사실 우선. RAG로 STAR를 채울 수 없으면 짧게 쓰거나 "
            "'내용이 부족하여 생성하지 않음'만 출력하세요.\n"
        )

    @staticmethod
    def _section_kind(title: str) -> str:
        t = (title or "").replace(" ", "")
        if "지원동기" in t:
            return "motivation"
        if "성장" in t:
            return "growth"
        if "직무역량" in t or ("직무" in t and "역량" in t):
            return "competency"
        if "포부" in t:
            return "aspiration"
        if "열정" in t or "노력" in t:
            return "passion"
        return "generic"

    @staticmethod
    def _extract_job_tokens(job_analysis: dict | None) -> list[str]:
        """공고 분석에서 적합도 판별용 토큰 추출 (다사용자·다직군 공통)."""
        if not job_analysis:
            return []
        blobs: list[str] = []
        for key in (
            "company_name", "companyName", "position", "job_description", "jobDescription",
            "summary",
        ):
            val = job_analysis.get(key)
            if isinstance(val, str) and val.strip():
                blobs.append(val)
        for key in (
            "required_skills", "requiredSkills", "preferred_skills", "preferredSkills",
            "tech_keywords", "techKeywords", "job_responsibilities", "jobResponsibilities",
            "qualifications",
        ):
            val = job_analysis.get(key)
            if isinstance(val, list):
                blobs.extend(str(x) for x in val if x)
            elif isinstance(val, str) and val.strip():
                blobs.append(val)
        text = " ".join(blobs).lower()
        # 한글·영문 토큰 (2글자 이상). 공고 특화 고유명만으로 판별.
        raw = re.findall(r"[0-9a-zA-Z가-힣]{2,}", text)
        # 너무 흔한 토큰은 제외
        stop = {
            "및", "또는", "관련", "경험", "우대", "필수", "담당", "업무", "개발", "가능",
            "이상", "이하", "경력", "채용", "모집", "회사", "저희", "기반", "사용",
            "and", "or", "the", "for", "with", "from", "year", "years",
        }
        seen: set[str] = set()
        tokens: list[str] = []
        for t in raw:
            tl = t.lower()
            if tl in stop or tl in seen:
                continue
            seen.add(tl)
            tokens.append(tl)
            if len(tokens) >= 40:
                break
        return tokens

    @classmethod
    def _experience_job_score(cls, exp: dict, tokens: list[str]) -> int:
        if not tokens:
            return 0
        text = (exp.get("content") or "").lower()
        return sum(1 for t in tokens if t in text)

    @classmethod
    def _filter_job_relevant_experiences(
        cls,
        experiences: list[dict],
        job_analysis: dict | None,
    ) -> list[dict]:
        """공고와 토큰 겹침이 약한 경험은 생성 배정에서 제외."""
        pool = [e for e in experiences if e.get("content")]
        if not pool:
            return []
        tokens = cls._extract_job_tokens(job_analysis)
        if not tokens:
            return pool

        scored = [(cls._experience_job_score(e, tokens), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], str(x[1].get("entity_id") or "")))
        best = scored[0][0]
        if best <= 0:
            # 공고와 맞는 경험이 선택되지 않음 → 무관 카탈로그 덤프 대신 최상위 1개만
            return [scored[0][1]]
        min_score = max(1, best // 3)  # 최고점 대비 완화 — 같은 직군 경험은 유지, 무관(0점)은 제외
        kept = [e for s, e in scored if s >= min_score]
        return kept or [scored[0][1]]

    @classmethod
    def _assign_section_experiences(
        cls,
        titles: list[str],
        experiences: list[dict],
        job_analysis: dict | None = None,
    ) -> list[list[dict]]:
        """문항별로 primary 경험을 나눈다. 공고 적합도 높은 경험만 풀로 사용.

        1차: 문항당 미사용 경험 1개 (포부는 남는 경험만, 없으면 빈 목록)
        2차: 직무역량에만 미사용 경험 1개 추가
        """
        relevant = cls._filter_job_relevant_experiences(experiences, job_analysis)
        tokens = cls._extract_job_tokens(job_analysis)
        pool = sorted(
            relevant,
            key=lambda e: (-cls._experience_job_score(e, tokens), str(e.get("entity_id") or "")),
        )
        if not pool:
            return [[] for _ in titles]

        used: set[str] = set()

        def _eid(exp: dict) -> str:
            return str(exp.get("entity_id") or "")

        def next_unused() -> dict | None:
            for exp in pool:
                eid = _eid(exp)
                if eid and eid in used:
                    continue
                if eid:
                    used.add(eid)
                return exp
            return None

        kinds = [cls._section_kind(t) for t in titles]
        assignments: list[list[dict]] = [[] for _ in titles]

        # 1차: 포부 제외하고 하나씩 (적합도 높은 순의 pool)
        for i, kind in enumerate(kinds):
            if kind == "aspiration":
                continue
            picked = next_unused()
            if picked is not None:
                assignments[i].append(picked)

        # 2차: 직무역량에 추가 1개
        for i, kind in enumerate(kinds):
            if kind != "competency":
                continue
            picked = next_unused()
            if picked is not None:
                assignments[i].append(picked)

        # 포부: 남은 미사용만 (없으면 빈 목록 → 계획만)
        for i, kind in enumerate(kinds):
            if kind != "aspiration":
                continue
            picked = next_unused()
            if picked is not None:
                assignments[i].append(picked)

        # 아무 것도 못 받은 비-포부 문항: 적합 풀 안에서만 재사용
        if pool:
            cursor = 0
            for i, kind in enumerate(kinds):
                if assignments[i] or kind == "aspiration":
                    continue
                assignments[i].append(pool[cursor % len(pool)])
                cursor += 1

        return assignments

    async def _generate_by_sections(
        self,
        system_prompt: str,
        fill_user_prompt,
        experiences: list[dict],
        titles: list[str],
        rewrite_level: int = 40,
        job_analysis: dict | None = None,
        section_index: int | None = None,
        existing_paragraphs: list[str] | None = None,
    ) -> tuple[str, str, list[dict[str, Any]]]:
        """문항별로 본문을 생성한다. 권장 상한 ~1600자, 사실 부족 시 짧게 (자동 확장 없음).

        section_index가 있으면 해당 문항만 LLM을 호출하고 나머지는 existing_paragraphs를 유지한다.
        문항별 실패는 전체 중단 없이 status=error로 기록한다.
        """
        existing = list(existing_paragraphs or [])
        while len(existing) < len(titles):
            existing.append("")
        existing = existing[: len(titles)]

        paragraphs: list[str] = list(existing)
        sections: list[dict[str, Any]] = []
        model_name = ""
        rewrite_rules = self._rewrite_level_rules(rewrite_level)
        assignments = self._assign_section_experiences(titles, experiences, job_analysis)
        section_system = (
            system_prompt
            + "\n\n[Section Mode]\n"
            "- 지금은 한 문항의 본문만 작성합니다.\n"
            "- 문항 제목·번호·마크다운을 본문에 넣지 마세요.\n"
            "- 권장 상한 약 1600자. 필수 하한 없음. RAG 사실만으로 가능한 길이로 쓰세요.\n"
            "- 지어내서 분량을 채우면 실패입니다. 분량보다 사실 우선. 짧은 사실 문단은 성공입니다.\n"
            "- STAR를 구체화하되 수치는 RAG에 있는 것만.\n"
            "- 이 문항에 배정된 경험만 사용하세요. 경험 카탈로그 나열 금지.\n"
            "- 역할·직군 표현은 경험에 적힌 것만. 입력에 없는 라벨을 붙이지 마세요.\n"
            "- 시점은 기간·본문에 있을 때만. 학창↔실무 이동·즉시성 단정 금지.\n"
            "- 성장과정: 학창 근거 없으면 일반론 1~2문장 + 배정된 실무만.\n"
            "- 빈 줄로 문단을 쪼개지 마세요. 연속 본문만 출력하세요.\n"
            "- 번역투·공허한 마무리·상투구 금지. 쉼표 문장당 1개, 문두 부사 뒤 쉼표 금지.\n"
            "- 이미 작성한 문항과 같은 문장·경험 국면을 반복하지 마세요.\n"
            + rewrite_rules
        )

        target_indices = (
            {section_index}
            if section_index is not None and 0 <= section_index < len(titles)
            else set(range(len(titles)))
        )

        for i, title in enumerate(titles):
            if i not in target_indices:
                kept = (paragraphs[i] if i < len(paragraphs) else "").strip()
                sections.append({
                    "index": i,
                    "title": title,
                    "content": kept,
                    "status": "ok" if kept else "skipped",
                    "error": None,
                })
                continue

            try:
                kind = self._section_kind(title)
                section_exps = assignments[i] if i < len(assignments) else []
                if not section_exps and kind != "aspiration":
                    section_exps = experiences[:1] if experiences else []
                base_user_msg = fill_user_prompt(section_exps)
                assigned_ids = ", ".join(
                    str(e.get("entity_id")) for e in section_exps if e.get("entity_id")
                ) or "(없음 — 과거 프로젝트 서술 없이 문항 초점에 맞게만 작성)"
                prev = "\n".join(
                    f"- {titles[j]}: {(paragraphs[j] or '')[:250]}…"
                    for j in range(len(titles))
                    if j != i and (paragraphs[j] or "").strip()
                ) or "(없음)"
                slot_rule = self._section_slot_rules(title)
                section_user = (
                    f"{base_user_msg}\n\n"
                    f"## 이번에 작성할 문항 ({i + 1}/{len(titles)})\n"
                    f"제목: {title}\n"
                    f"이 문항에서만 사용할 경험 id: {assigned_ids}\n"
                    f"위에 배정되지 않은 경험은 쓰지 마세요.\n"
                    f"이 문항 본문만 출력하세요. 제목/번호 없이 순수 문장만.\n"
                    f"권장 상한 약 1600자. 필수 하한 없음. 사실 부족 시 짧게 (허구 금지).\n"
                    f"다른 문항과 내용이 중복되지 않게, 이 제목 의미에 맞게 쓰세요.\n"
                    f"{slot_rule}\n"
                    f"{rewrite_rules}"
                    f"## 이미 작성한 문항 (참고·중복 금지)\n{prev}\n"
                )
                completion = await self.complete_for_operation(
                    "GENERATE", section_system, section_user, temperature=0.4,
                )
                model_name = completion.model or model_name
                para = self._clean_single_section(completion.content or "", title)

                violations = self._style_violations(para) + self._section_topic_violations(title, para)
                if violations:
                    logger.warning(
                        "Section %s/%s (%s) style violations: %s",
                        i + 1,
                        len(titles),
                        title,
                        violations[:8],
                    )
                    fixed = await self.complete_for_operation(
                        "GENERATE",
                        section_system
                        + "\n[Style Fix] 사실·수치·시점·역할은 유지하고 문체·문항 초점만 고치세요. "
                        "분량을 늘리기 위해 새 사실을 넣지 마세요. "
                        "문항 초점에 맞지 않는 소재(예: 지원동기의 AI 코딩 도구 제품명)는 삭제하세요.",
                        (
                            f"아래 본문에서 다음을 고치세요: {violations}\n"
                            f"문항 제목: {title}\n"
                            f"{slot_rule}"
                            f"쉼표는 문장당 1개 이하, 문두 부사 뒤 쉼표 금지.\n"
                            f"사실을 지어내지 마세요. 분량보다 사실 우선. 본문만 출력.\n\n{para}"
                        ),
                        temperature=0.3,
                    )
                    cleaned = self._clean_single_section(fixed.content or "", title)
                    cleaned_violations = (
                        self._style_violations(cleaned) + self._section_topic_violations(title, cleaned)
                    )
                    if (
                        len(cleaned) >= len(para) * 0.85
                        and len(cleaned_violations) < len(violations)
                    ):
                        para = cleaned
                        model_name = fixed.model or model_name

                if not para.strip():
                    raise RuntimeError("Empty section content")

                paragraphs[i] = para
                sections.append({
                    "index": i,
                    "title": title,
                    "content": para,
                    "status": "ok",
                    "error": None,
                })
                logger.info(
                    "Section generated %s/%s (%s): %s chars (style_violations=%s)",
                    i + 1,
                    len(titles),
                    title,
                    len(para),
                    len(self._style_violations(para) + self._section_topic_violations(title, para)),
                )
            except Exception as exc:
                logger.exception("Section %s/%s (%s) failed: %s", i + 1, len(titles), title, exc)
                # 부분 재생성 실패 시 기존 본문 유지
                kept = (existing[i] if i < len(existing) else "").strip()
                paragraphs[i] = kept
                sections.append({
                    "index": i,
                    "title": title,
                    "content": kept,
                    "status": "error",
                    "error": str(exc) or "Section generation failed",
                })

        return "\n\n".join(paragraphs), model_name, sections

    @staticmethod
    def _section_slot_rules(title: str) -> str:
        """문항 제목에 맞는 초점·금지 소재 (다사용자 공통 + AI도구 UX 정책)."""
        t = (title or "").replace(" ", "")
        if "지원동기" in t:
            return (
                "【문항 슬롯·지원동기】\n"
                "- 초점: 왜 이 직무/회사인가. 공고 핵심 요구와 배정 경험 1개(최대 2개)만 연결.\n"
                "- 제품 UX 금지: AI 코딩 도구 제품명(Claude/Cursor 등), 개발 생산성 도구 도입을 "
                "지원동기의 주요 소재로 쓰지 말 것. 경험 카탈로그 나열 금지.\n"
                "- 역할·시점은 배정 경험에 적힌 표현·기간만 사용.\n"
            )
        if "성장" in t:
            return (
                "【문항 슬롯·성장과정】\n"
                "- 학창·전공·팀 협업 구체 근거가 없으면 일반론 1~2문장만 쓰고 "
                "배정된 실무 경험으로 관점 변화로 이어가세요.\n"
                "- 금지: 실무 경험 포트폴리오 나열, 학창으로의 시점 이동, "
                "기간 없는 즉시성 단정, 없는 수치·수상, AI 코딩 도구 제품명.\n"
                "- 배정 경험은 '일하는 방식이 어떻게 바뀌었는지'만 짧게.\n"
            )
        if "직무역량" in t or ("직무" in t and "역량" in t):
            return (
                "【문항 슬롯·직무역량】\n"
                "- 초점: 기술적 의사결정·구현·성능/자동화. 배정 경험마다 다른 기술 국면.\n"
                "- AI 코딩 도구 경험은 이 문항에서만 주요 소재로 허용(제품 UX).\n"
            )
        if "포부" in t:
            return (
                "【문항 슬롯·입사 후 포부】\n"
                "- 초점: 앞으로 할 일·실행 계획만 (3·6·12개월 수준).\n"
                "- 금지: 과거 프로젝트를 다시 길게 서술. AI 코딩 도구 제품명 나열.\n"
                "- 과거는 한 문장 근거만 허용(배정된 경우에 한함).\n"
            )
        if "열정" in t or "노력" in t:
            return (
                "【문항 슬롯·열정/노력 경험】\n"
                "- 초점: 단일 사건 심층(문제·고민·행동·결과). 배정 경험만.\n"
                "- 금지: 다른 경험을 끼워 넣기. AI 코딩 도구를 주요 소재로 쓰기. 성공담만으로 끝내기.\n"
            )
        return (
            "【문항 슬롯】\n"
            "- 이 제목 의미에 맞는 배정 경험만 1~2개. 다른 문항과 같은 국면 반복 금지.\n"
        )

    @staticmethod
    def _section_topic_violations(title: str, text: str) -> list[str]:
        """문항 초점·제품 UX(AI 도구) 위반. 특정 사용자 도메인 키워드는 쓰지 않음."""
        if not text:
            return []
        title_norm = (title or "").replace(" ", "")
        found: list[str] = []

        def _match_title(*keys: str) -> bool:
            return any(k.replace(" ", "") in title_norm for k in keys)

        ai_tool = re.compile(r"AI\s*도구|Claude|Cursor|코딩\s*도구|개발\s*생산성")

        if _match_title("지원동기"):
            if ai_tool.search(text):
                found.append("슬롯위반:AI도구")

        if _match_title("성장과정", "성장"):
            if ai_tool.search(text):
                found.append("슬롯위반:AI도구")

        if _match_title("포부"):
            if re.search(r"Claude|Cursor", text):
                found.append("슬롯위반:AI도구")

        if _match_title("열정", "노력했던", "노력"):
            if ai_tool.search(text):
                found.append("슬롯위반:AI도구")

        return found

    @staticmethod
    def _style_violations(text: str) -> list[str]:
        """번역투·공허한 마무리·쉼표 남발·반복 상투구 등 문체 위반 목록."""
        if not text:
            return []
        found: list[str] = []
        for label, pattern in _STYLE_PATTERNS:
            if pattern.search(text):
                found.append(label)
        for phrase in _REPEAT_PHRASES:
            count = text.count(phrase)
            if count >= 2:
                found.append(f"반복: {phrase} {count}회")
        for m in _LEADING_ADVERB_COMMA.finditer(text):
            found.append(f"{m.group(1).replace(' ', '')},")
        sentences = [s.strip() for s in re.split(r"(?<=[.!?다요])\s+", text) if s.strip()]
        for s in sentences:
            if s.count(",") >= 2:
                found.append("쉼표 2개+")
                break
        connectors = _CONNECTOR_ADVERBS.findall(text)
        if len(connectors) > 2:
            found.append(f"접속부사 {len(connectors)}회")
        return found

    @staticmethod
    def _clean_single_section(raw: str, title: str) -> str:
        text = (raw or "").strip()
        # 모델이 제목을 붙인 경우 제거
        for prefix in (f"# {title}", f"## {title}", f"**{title}**", f"{title}", f"{title}:"):
            if text.startswith(prefix):
                text = text[len(prefix):].lstrip(" \n:#*-")
        # 문항 모드에서는 내부 빈 줄도 한 문단으로 합침
        parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        if len(parts) > 1:
            text = " ".join(parts)
        return text.strip()

    @staticmethod
    def _normalize_section_paragraphs(content: str, section_count: int) -> str:
        """빈 줄 기준 문단 수를 문항 수와 정확히 맞춘다."""
        if section_count <= 0:
            return content
        paras = [p.strip() for p in re.split(r"\n\s*\n", (content or "").strip()) if p.strip()]
        if not paras:
            return content
        if len(paras) == section_count:
            return "\n\n".join(paras)
        if len(paras) > section_count:
            # 남는 문단은 마지막 문항에 합침
            head = paras[: section_count - 1]
            tail = " ".join(paras[section_count - 1 :])
            logger.info(
                "Normalized paragraphs: %s -> %s (merged extras into last section)",
                len(paras),
                section_count,
            )
            return "\n\n".join(head + [tail])
        # 부족하면 그대로 두고 UI/재시도에서 처리 (내용 날리지 않음)
        logger.warning(
            "Paragraph count %s < section_count %s after generation",
            len(paras),
            section_count,
        )
        return "\n\n".join(paras)

    def _looks_truncated_resume(
        self,
        content: str,
        experience_count: int,
        section_count: int = 0,
    ) -> bool:
        if not content:
            return True
        # 분량보다 사실 우선: 섹션 모드에서는 극단적으로 짧을 때만 truncated로 본다.
        # 문단이 짧아도(사실만으로 끝난 경우) 재생성으로 몰지 않는다.
        if section_count > 0:
            min_chars = max(120, min(section_count, 5) * 80)
        else:
            min_chars = 2500 if experience_count >= 2 else 1000
        if len(content) < min_chars:
            return True
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
        if section_count > 0 and len(paragraphs) < section_count:
            return True
        # 이전: any(len(p) < 200) → 짧은 사실 문단을 실패로 처리해 재생성·날조를 유발
        if section_count > 0 and any(len(p) < 40 for p in paragraphs):
            return True
        stripped = content.rstrip()
        if stripped.endswith((",", "·", "/", "(", "[")):
            return True
        if not re.search(r"[.!?다요임음]$", stripped[-1:]):
            if len(stripped) < min_chars and not stripped.endswith(("다.", "요.", "니다.", "습니다.")):
                last_line = stripped.splitlines()[-1].strip() if stripped.splitlines() else stripped
                if len(last_line) < 40 and not re.search(r"[.!?다요]$", last_line):
                    return True
        return False

    async def _resolve_routes(self, operation: str) -> list[LlmRoute]:
        routes = await provider_router.routes_for(operation)
        if routes:
            return routes
        return provider_router.env_fallback_routes(operation)

    def _model_for(
        self,
        route: LlmRoute,
        temperature: float,
        operation: str = "",
        default_max_tokens: int | None = None,
    ) -> ChatOpenAI:
        kwargs: dict[str, Any] = {
            "model": route.model_name,
            "api_key": route.api_key,
            "temperature": temperature,
        }
        if route.base_url:
            kwargs["base_url"] = route.base_url
        # DeepSeek V4는 thinking 기본 ON → JSON 생성·토큰 비용에 불리. 자소서 파이프라인은 비활성.
        if route.provider_slug == "deepseek":
            kwargs["extra_body"] = {"thinking": {"type": "disabled"}}
        max_tokens = OPERATION_MAX_TOKENS.get(operation, default_max_tokens)
        if max_tokens:
            # OpenAI 호환 모델(gpt-4o-mini 등)은 completion 상한 16384
            model_name = (route.model_name or "").lower()
            if "gpt-4o" in model_name or model_name.startswith("gpt-"):
                max_tokens = min(max_tokens, 16384)
            kwargs["max_tokens"] = max_tokens
        return ChatOpenAI(**kwargs)

    def _message_text(self, message: BaseMessage) -> str:
        content = message.content
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        return str(content or "")

    async def _chat(self, route: LlmRoute, system: str, user: str, temperature: float, operation: str = "") -> str:
        model = self._model_for(route, temperature, operation)
        response = await model.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=user),
        ])
        return self._message_text(response)

    def _is_retryable(self, exc: Exception) -> bool:
        if isinstance(exc, RateLimitError):
            return True
        # 404: OpenRouter :free 모델 퇴역 등 — 다음 provider로 넘어간다
        if isinstance(exc, APIStatusError) and exc.status_code in {
            401, 403, 404, 408, 429, 500, 502, 503, 504,
        }:
            return True
        msg = str(exc).lower()
        if "unavailable for free" in msg or "credit_balance_exhausted" in msg:
            return True
        return False

llm_service = LlmService()
