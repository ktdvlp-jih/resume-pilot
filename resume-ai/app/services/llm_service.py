import re
from typing import Any

from openai import OpenAI

from app.config import settings


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


class LlmService:
    def __init__(self) -> None:
        if settings.openai_api_key:
            kwargs: dict = {"api_key": settings.openai_api_key}
            if settings.openai_base_url:
                kwargs["base_url"] = settings.openai_base_url
            self._client = OpenAI(**kwargs)
        else:
            self._client = None
        self._fallback = RuleBasedGenerator()

    @property
    def has_llm(self) -> bool:
        return self._client is not None

    def complete(self, system: str, user: str) -> str:
        if not self._client:
            return self._fallback.generate_resume([], 40)["content"]
        response = self._client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content or ""

    def generate_with_context(
        self,
        experiences: list[dict],
        rewrite_level: int,
        job_analysis: dict | None,
        writing_style: str,
        system_prompt: str,
        user_prompt: str,
    ) -> dict[str, Any]:
        if not experiences:
            return self._fallback.generate_resume([], rewrite_level, job_analysis)

        exp_text = "\n".join(
            f"- [{e.get('entity_id', 'unknown')}] {e.get('content', '')}"
            for e in experiences if e.get("content")
        )
        if not exp_text.strip():
            return self._fallback.generate_resume(experiences, rewrite_level, job_analysis)

        if not self._client:
            return self._fallback.generate_resume(experiences, rewrite_level, job_analysis)

        user_msg = user_prompt.replace("{{experiences}}", exp_text)
        user_msg = user_msg.replace("{{rewrite_level}}", str(rewrite_level))
        user_msg = user_msg.replace("{{writing_style}}", writing_style or "사용자 기본 문체")
        user_msg = user_msg.replace("{{job_analysis}}", str(job_analysis or {}))

        content = self.complete(system_prompt, user_msg)
        return {
            "content": content,
            "experience_ids": [e.get("entity_id") for e in experiences if e.get("entity_id")],
            "insufficient": False,
        }


llm_service = LlmService()
rule_based = RuleBasedGenerator()
