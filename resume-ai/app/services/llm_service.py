import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from openai import APIStatusError, OpenAI, RateLimitError

from app.config import settings
from app.services.provider_router import LlmRoute, provider_router

logger = logging.getLogger(__name__)

RULE_BASED_MODEL = "rule-based"


@dataclass(frozen=True)
class LlmCompletion:
    content: str
    model: str | None = None


class RuleBasedGenerator:
    def generate_resume(
        self,
        experiences: list[dict],
        rewrite_level: int,
        job_analysis: dict | None = None,
    ) -> dict[str, Any]:
        if not experiences:
            return {
                "content": "내용이 부족하여 생성하지 않음",
                "experience_ids": [],
                "insufficient": True,
            }

        company = (job_analysis or {}).get("company_name", "해당 기업")
        paragraphs = []
        for exp in experiences[:3]:
            content = exp.get("content") or exp.get("title", "")
            if content:
                paragraphs.append(content.strip())

        if not paragraphs:
            return {
                "content": "내용이 부족하여 생성하지 않음",
                "experience_ids": [e.get("entity_id") for e in experiences],
                "insufficient": True,
            }

        header = f"{company} 지원을 위해 아래 경험을 바탕으로 작성했습니다.\n\n"
        body = "\n\n".join(paragraphs)
        if rewrite_level >= 60:
            body = self._restructure(body)
        content = header + body

        return {
            "content": content,
            "experience_ids": [e.get("entity_id") for e in experiences if e.get("entity_id")],
            "insufficient": False,
        }

    def detect_ai_traces(self, content: str, forbidden: list[str] | None = None) -> list[dict]:
        forbidden = forbidden or []
        sentences = [s.strip() for s in re.split(r"[.!?]\s*", content) if s.strip()]
        results = []
        for i, sentence in enumerate(sentences):
            level = "GREEN"
            reason = "자연스러운 표현"
            for expr in forbidden:
                if expr and expr in sentence:
                    level = "RED"
                    reason = f"AI 특유 표현 감지: '{expr}'"
                    break
            if level == "GREEN" and len(sentence) > 120:
                level = "YELLOW"
                reason = "문장이 다소 길어 수정 권장"
            results.append({
                "sentence_index": i,
                "sentence": sentence,
                "level": level,
                "reason": reason,
                "suggestion": sentence.replace("최선을 다하겠습니다", "목표 달성을 위해") if level != "GREEN" else None,
            })
        return results

    def review_feedback(self, content: str) -> list[dict]:
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        reviews = []
        for i, para in enumerate(paragraphs):
            has_number = bool(re.search(r"\d+", para))
            reviews.append({
                "paragraph_index": i,
                "strengths": ["구체적 경험 포함"] if has_number else ["경험 기반 서술"],
                "weaknesses": [] if has_number else ["수치 기반 성과 부족"],
                "company_fit": "보통",
                "specificity": "높음" if has_number else "보통",
                "persuasiveness": "보통",
                "star_applied": "STAR" in para or has_number,
                "improvement": "성과에 숫자를 추가하면 설득력이 높아집니다." if not has_number else "현재 수준 유지",
                "suggestion": para,
            })
        return reviews

    def _restructure(self, text: str) -> str:
        lines = text.split("\n")
        return "\n".join(f"- {line}" if line and not line.startswith("-") else line for line in lines)


OPERATION_MAX_TOKENS: dict[str, int] = {
    "JOB_ANALYSIS": 4096,
    "GENERATE": 4096,
    "AI_DETECTION": 2048,
    "AI_REVIEW": 2048,
}


class LlmService:
    def __init__(self) -> None:
        self._fallback = RuleBasedGenerator()

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
            return LlmCompletion(content="")

        last_error: Exception | None = None
        for route in routes:
            try:
                content = self._chat(route, system, user, temperature, operation)
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
            raise last_error
        return LlmCompletion(content="")

    async def complete_json_for_operation(
        self,
        operation: str,
        system: str,
        user: str,
        temperature: float = 0.2,
    ) -> tuple[dict[str, Any] | None, str | None]:
        completion = await self.complete_for_operation(operation, system, user, temperature=temperature)
        return self.parse_json_response(completion.content), completion.model

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
            return LlmCompletion(content="")

        last_error: Exception | None = None
        for route in routes:
            try:
                client = self._client_for(route)
                response = client.chat.completions.create(
                    model=route.model_name,
                    messages=[
                        {"role": "system", "content": system},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_text},
                                {"type": "image_url", "image_url": {"url": image_data_url}},
                            ],
                        },
                    ],
                    temperature=temperature,
                    max_tokens=OPERATION_MAX_TOKENS.get(operation, 2048),
                )
                return LlmCompletion(
                    content=response.choices[0].message.content or "",
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
            raise last_error
        return LlmCompletion(content="")

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

    def parse_json_response(self, text: str) -> dict[str, Any] | None:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None

    async def generate_with_context(
        self,
        experiences: list[dict],
        rewrite_level: int,
        job_analysis: dict | None,
        writing_style: str,
        system_prompt: str,
        user_prompt: str,
    ) -> dict[str, Any]:
        if not experiences:
            fallback = self._fallback.generate_resume([], rewrite_level, job_analysis)
            fallback["model"] = RULE_BASED_MODEL
            return fallback

        exp_text = "\n".join(
            f"- [{e.get('entity_id', 'unknown')}] {e.get('content', '')}"
            for e in experiences if e.get("content")
        )
        if not exp_text.strip():
            fallback = self._fallback.generate_resume(experiences, rewrite_level, job_analysis)
            fallback["model"] = RULE_BASED_MODEL
            return fallback

        user_msg = user_prompt.replace("{{experiences}}", exp_text)
        user_msg = user_msg.replace("{{rewrite_level}}", str(rewrite_level))
        user_msg = user_msg.replace("{{writing_style}}", writing_style or "사용자 기본 문체")
        user_msg = user_msg.replace("{{job_analysis}}", str(job_analysis or {}))

        try:
            if not await self.has_routes("GENERATE"):
                fallback = self._fallback.generate_resume(experiences, rewrite_level, job_analysis)
                fallback["model"] = RULE_BASED_MODEL
                return fallback
            completion = await self.complete_for_operation("GENERATE", system_prompt, user_msg)
        except Exception as exc:
            logger.warning("LLM generate failed, using rule fallback: %s", exc)
            fallback = self._fallback.generate_resume(experiences, rewrite_level, job_analysis)
            fallback["model"] = RULE_BASED_MODEL
            return fallback

        return {
            "content": completion.content,
            "experience_ids": [e.get("entity_id") for e in experiences if e.get("entity_id")],
            "insufficient": False,
            "model": completion.model,
        }

    async def _resolve_routes(self, operation: str) -> list[LlmRoute]:
        routes = await provider_router.routes_for(operation)
        if routes:
            return routes
        return provider_router.env_fallback_routes(operation)

    def _client_for(self, route: LlmRoute) -> OpenAI:
        kwargs: dict[str, str] = {"api_key": route.api_key}
        if route.base_url:
            kwargs["base_url"] = route.base_url
        return OpenAI(**kwargs)

    def _chat(self, route: LlmRoute, system: str, user: str, temperature: float, operation: str = "") -> str:
        client = self._client_for(route)
        kwargs: dict[str, Any] = {
            "model": route.model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
        }
        max_tokens = OPERATION_MAX_TOKENS.get(operation)
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    def _is_retryable(self, exc: Exception) -> bool:
        if isinstance(exc, RateLimitError):
            return True
        if isinstance(exc, APIStatusError) and exc.status_code in {401, 403, 429, 500, 502, 503, 504}:
            return True
        return False

llm_service = LlmService()
rule_based = RuleBasedGenerator()
