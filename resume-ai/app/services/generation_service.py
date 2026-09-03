import json
import logging
from typing import Any

from langchain_core.runnables import RunnableLambda

from app.clients.service_clients import prompt_client, rag_client
from app.services.ai_trace_score import score_detections
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class GenerationService:
    """자기소개서 생성 오케스트레이션 — LangChain LCEL 체인.

    RAG(context) -> Prompt(render, prompt-service만 사용) -> LLM -> 후처리.
    각 단계는 상태 dict를 받아 확장해 다음 단계로 넘긴다.
    """

    def __init__(self) -> None:
        self._chain = (
            RunnableLambda(self._build_context)
            | RunnableLambda(self._render_prompt)
            | RunnableLambda(self._generate)
            | RunnableLambda(self._postprocess)
        )

    async def generate_resume(self, request: dict[str, Any]) -> dict[str, Any]:
        state = await self._chain.ainvoke({"request": request})
        return state["response"]

    async def _build_context(self, state: dict[str, Any]) -> dict[str, Any]:
        request = state["request"]
        rag_context: dict[str, Any] = {"context": {"experiences": [], "writing_styles": []}}
        try:
            rag_context = await rag_client.build_context(
                request["user_id"],
                request.get("keywords", []),
                request.get("job_analysis"),
                request.get("experience_ids"),
            )
        except Exception as exc:
            logger.warning("RAG context build failed: %s", exc)
        context = rag_context.get("context", {})
        trial_experiences = request.get("trial_experiences")
        if isinstance(trial_experiences, list) and trial_experiences:
            experiences = [
                {
                    "entity_id": str(exp.get("entity_id") or f"trial-{idx + 1}"),
                    "content": str(exp.get("content") or "").strip(),
                }
                for idx, exp in enumerate(trial_experiences)
                if isinstance(exp, dict) and str(exp.get("content") or "").strip()
            ]
        else:
            experiences = context.get("experiences", [])
        writing_styles = context.get("writing_styles", [])
        return {
            **state,
            "experiences": experiences,
            "style_text": writing_styles[0].get("content", "") if writing_styles else "",
        }

    async def _render_prompt(self, state: dict[str, Any]) -> dict[str, Any]:
        request = state["request"]
        style_text = state["style_text"]
        job_analysis = request.get("job_analysis")
        rewrite_level = request.get("rewrite_level", 40)
        section_titles = (request.get("section_titles") or [])[:5]
        section_titles_text = (
            "\n".join(f"{i + 1}. {title}" for i, title in enumerate(section_titles))
            if section_titles else ""
        )
        target_chars = list(request.get("section_target_chars") or [])
        while len(target_chars) < len(section_titles):
            target_chars.append(1200)
        target_chars = target_chars[: len(section_titles)] if section_titles else target_chars[:5]
        section_target_chars_text = (
            "\n".join(
                f"{i + 1}. {title} → 목표 상한 {int(target_chars[i])}자 (초과 금지)"
                for i, title in enumerate(section_titles)
            )
            if section_titles
            else "(기본 · 문항 없음)"
        )
        user_instruction = (request.get("user_instruction") or "").strip() or "(없음)"
        prompt = await prompt_client.render("RESUME_GENERATION", {
            "experiences": "{{experiences}}",
            "job_analysis": str(job_analysis),
            "writing_style": style_text,
            "rewrite_level": rewrite_level,
            "section_titles": section_titles_text,
            "section_target_chars": section_target_chars_text,
            "user_instruction": user_instruction,
            "profile": "",
        })
        return {**state, "prompt": prompt}

    async def _generate(self, state: dict[str, Any]) -> dict[str, Any]:
        request = state["request"]
        prompt = state["prompt"]
        result = await llm_service.generate_with_context(
            experiences=state["experiences"],
            rewrite_level=request.get("rewrite_level", 40),
            job_analysis=request.get("job_analysis"),
            writing_style=state["style_text"],
            system_prompt=prompt["system_prompt"],
            user_prompt=prompt["user_prompt"],
            section_titles=request.get("section_titles") or [],
            section_index=request.get("section_index"),
            existing_paragraphs=request.get("existing_paragraphs") or [],
            section_target_chars=request.get("section_target_chars") or [],
            user_instruction=request.get("user_instruction") or "",
            section_experience_ids=request.get("section_experience_ids") or [],
        )
        return {**state, "result": result}

    async def _postprocess(self, state: dict[str, Any]) -> dict[str, Any]:
        request = state["request"]
        result = state["result"]
        rewrite_level = request.get("rewrite_level", 40)
        job_analysis = request.get("job_analysis")
        skip_postprocess = bool(request.get("skip_postprocess"))
        sections = result.get("sections") if isinstance(result.get("sections"), list) else []

        forbidden = request.get("forbidden_expressions", [])
        if forbidden and result.get("content"):
            result["content"] = self._apply_forbidden(str(result["content"]), forbidden)

        if result.get("insufficient"):
            response = {
                **result,
                "rewrite_level": rewrite_level,
                "quality_scores": {
                    "naturalness": 0,
                    "company_fit": 0,
                    "style_retention": 0,
                    "ai_trace_percent": 0,
                    "star_application": 0,
                    "experience_utilization": 0,
                    "scored_by": "none",
                },
                "detections": [],
                "reviews": [],
                "sections": sections,
            }
            return {**state, "response": response}

        if skip_postprocess:
            # 문항 부분 재생성: detect/review 생략(할당량 절약). 점수는 클라이언트가 유지.
            response = {
                **result,
                "rewrite_level": rewrite_level,
                "quality_scores": None,
                "detections": [],
                "reviews": [],
                "sections": sections,
            }
            return {**state, "response": response}

        detection_result = await detection_service.detect(result["content"], forbidden)
        review_result = await review_service.review(result["content"], job_analysis)
        detections = detection_result["detections"]
        ai_trace_percent = detection_result["ai_trace_percent"]
        naturalness = detection_result.get("naturalness")
        reviews = review_result["reviews"]
        review_scores = review_result.get("scores")

        response = {
            **result,
            "rewrite_level": rewrite_level,
            "quality_scores": self._score(
                result["content"], ai_trace_percent, review_scores, naturalness,
            ),
            "detections": detections,
            "reviews": reviews,
            "sections": sections,
        }
        return {**state, "response": response}

    def _apply_forbidden(self, content: str, forbidden: list) -> str:
        for expr in forbidden:
            if expr and str(expr) in content:
                content = content.replace(str(expr), "")
        return content

    def _score(
        self,
        content: str,
        ai_trace_percent: float,
        review_scores: dict[str, Any] | None,
        naturalness: float | None = None,
    ) -> dict[str, float]:
        if naturalness is None:
            naturalness = max(0, 100 - ai_trace_percent)
        if not review_scores:
            raise RuntimeError("AI_REVIEW returned no usable scores")
        scaled = normalize_review_scores(review_scores)
        return {
            "naturalness": naturalness,
            "company_fit": scaled["company_fit"],
            "style_retention": scaled["style_retention"],
            "ai_trace_percent": ai_trace_percent,
            "star_application": scaled["star_application"],
            "experience_utilization": scaled["experience_utilization"],
            "scored_by": "llm",
        }


class DetectionService:
    async def detect(self, content: str, forbidden: list[str] | None = None) -> dict[str, Any]:
        if not await llm_service.has_routes("AI_DETECTION"):
            raise RuntimeError("LLM routes unavailable for AI_DETECTION")
        forbidden_lines = [e for e in (forbidden or []) if e]
        forbidden_text = (
            "금지 표현 목록:\n" + "\n".join(f"- {e}" for e in forbidden_lines)
            if forbidden_lines
            else ""
        )
        prompt = await prompt_client.render("AI_DETECTION", {
            "content": content,
            "forbidden_expressions": forbidden_text,
        })
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "AI_DETECTION",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.2,
        )
        detections = parsed if isinstance(parsed, list) else (
            parsed.get("detections") if isinstance(parsed, dict) else None
        )
        if not isinstance(detections, list):
            raise RuntimeError(
                f"AI_DETECTION returned unparseable response: {(completion.content or '')[:200]}"
            )
        detections = [
            d for d in detections
            if isinstance(d, dict) and str(d.get("level", "")).upper() in {"GREEN", "YELLOW", "RED"}
        ]
        scored = score_detections(detections, content)
        return {
            "detections": detections,
            "ai_trace_percent": scored["ai_trace_percent"],
            "naturalness": scored["naturalness"],
            "model": completion.model,
        }


_REVIEW_SCORE_KEYS = (
    "company_fit",
    "style_retention",
    "star_application",
    "experience_utilization",
)


def normalize_review_scores(scores: dict[str, Any]) -> dict[str, float]:
    """첨삭 점수를 0~100으로 맞춘다. LLM이 1~5(또는 1~10)를 주면 환산한다."""
    vals: list[float] = []
    for key in _REVIEW_SCORE_KEYS:
        try:
            vals.append(float(scores.get(key, 0) or 0))
        except (TypeError, ValueError):
            vals.append(0.0)
    max_v = max(vals) if vals else 0.0
    if 0 < max_v <= 5:
        scale = 20.0
    elif max_v <= 10:
        scale = 10.0
    else:
        scale = 1.0
    return {
        key: max(0.0, min(100.0, round(value * scale)))
        for key, value in zip(_REVIEW_SCORE_KEYS, vals)
    }


class ReviewService:
    _SCORES_RETRY_HINT = (
        "\n\n[Retry] Previous reply omitted usable scores. "
        "Return ONE JSON object with BOTH non-empty \"reviews\" array AND \"scores\" object "
        "containing integer fields 0-100 (never 1-5): "
        "company_fit, style_retention, star_application, experience_utilization. "
        "Example: a solid answer is 80, not 4."
    )

    async def review(self, content: str, job_analysis: dict | None = None) -> dict[str, Any]:
        if not await llm_service.has_routes("AI_REVIEW"):
            raise RuntimeError("LLM routes unavailable for AI_REVIEW")
        prompt = await prompt_client.render("AI_REVIEW", {
            "content": content,
            "job_analysis": str(job_analysis or {}),
        })
        system = prompt["system_prompt"]
        user = prompt["user_prompt"]

        parsed, completion = await llm_service.complete_json_value_for_operation(
            "AI_REVIEW", system, user, temperature=0.3,
        )
        reviews, scores = self._extract_reviews_and_scores(parsed)
        if reviews and scores:
            return {
                "reviews": reviews,
                "scores": scores,
                "job_analysis": job_analysis,
                "model": completion.model,
            }

        logger.warning(
            "AI_REVIEW missing reviews/scores (reviews=%s scores=%s); retrying once. raw=%.400s",
            bool(reviews),
            bool(scores),
            (completion.content or ""),
        )
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "AI_REVIEW",
            system + self._SCORES_RETRY_HINT,
            user + "\n\nInclude scores object with 0-100 integers. Never use a 1-5 scale.",
            temperature=0.2,
        )
        reviews, scores = self._extract_reviews_and_scores(parsed)
        if not reviews:
            raise RuntimeError(
                f"AI_REVIEW returned unparseable reviews: {(completion.content or '')[:240]}"
            )
        if not scores:
            raise RuntimeError(
                f"AI_REVIEW returned no usable scores after retry: {(completion.content or '')[:240]}"
            )
        return {
            "reviews": reviews,
            "scores": scores,
            "job_analysis": job_analysis,
            "model": completion.model,
        }

    @staticmethod
    def _extract_reviews_and_scores(
        parsed: dict[str, Any] | list[Any] | None,
    ) -> tuple[list[dict] | None, dict[str, Any] | None]:
        if isinstance(parsed, list):
            reviews = parsed if parsed else None
            return reviews, None
        if not isinstance(parsed, dict):
            return None, None
        reviews = parsed.get("reviews")
        reviews = reviews if isinstance(reviews, list) and reviews else None
        scores = parsed.get("scores")
        if not isinstance(scores, dict) or not scores:
            return reviews, None
        # require at least one numeric-like quality key
        usable = any(
            k in scores and scores[k] is not None
            for k in _REVIEW_SCORE_KEYS
        )
        if not usable:
            return reviews, None
        return reviews, {**scores, **normalize_review_scores(scores)}


class InterviewService:
    async def generate(self, content: str) -> dict[str, Any]:
        if not await llm_service.has_routes("INTERVIEW_QUESTIONS"):
            raise RuntimeError("LLM routes unavailable for INTERVIEW_QUESTIONS")
        prompt = await prompt_client.render("INTERVIEW_QUESTIONS", {"content": content})
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "INTERVIEW_QUESTIONS",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.5,
        )
        questions = parsed if isinstance(parsed, list) else (
            parsed.get("questions") if isinstance(parsed, dict) else None
        )
        if not isinstance(questions, list) or not questions:
            raise RuntimeError(
                f"INTERVIEW_QUESTIONS returned unparseable response: {(completion.content or '')[:200]}"
            )
        valid = [q for q in questions if isinstance(q, dict) and q.get("question")]
        if not valid:
            raise RuntimeError("INTERVIEW_QUESTIONS returned no valid questions")
        return {
            "questions": valid,
            "model": completion.model,
        }


class KeywordService:
    async def compare(self, job_keywords: list[str], resume_content: str) -> dict[str, Any]:
        if not await llm_service.has_routes("KEYWORD_COMPARE"):
            raise RuntimeError("LLM routes unavailable for KEYWORD_COMPARE")
        compact_keywords = ", ".join(job_keywords[:40])
        compact_resume = resume_content[:4000]
        prompt = await prompt_client.render("KEYWORD_COMPARE", {
            "job_keywords": compact_keywords,
            "resume_content": compact_resume,
        })
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "KEYWORD_COMPARE",
            prompt["system_prompt"]
            + "\n[Compact] Prefer short keyword tokens. Keep each array under 30 items.",
            prompt["user_prompt"],
            temperature=0.2,
        )
        if not (
            isinstance(parsed, dict)
            and isinstance(parsed.get("matched"), list)
            and isinstance(parsed.get("missing"), list)
        ):
            raise RuntimeError(
                f"KEYWORD_COMPARE returned unparseable response: {(completion.content or '')[:200]}"
            )
        return {
            "matched": parsed["matched"],
            "missing": parsed["missing"],
            "recommended": parsed.get("recommended") if isinstance(parsed.get("recommended"), list) else [],
            "overused": parsed.get("overused") if isinstance(parsed.get("overused"), list) else [],
            "model": completion.model,
        }


class PortfolioReviewService:
    """설정 초고(경력기술서·5-1~5-5) ↔ 경험 라이브러리 대조. 재작성 없음."""

    async def review(
        self,
        section_type: str,
        section_purpose: str,
        content: str,
        experiences: str,
    ) -> dict[str, Any]:
        if not await llm_service.has_routes("PORTFOLIO_REVIEW"):
            raise RuntimeError("LLM routes unavailable for PORTFOLIO_REVIEW")
        prompt = await prompt_client.render("PORTFOLIO_REVIEW", {
            "section_type": section_type,
            "section_purpose": section_purpose,
            "content": content or "(비어 있음)",
            "experiences": experiences,
        })
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "PORTFOLIO_REVIEW",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.3,
        )
        result = self._normalize(parsed)
        if result is None:
            raise RuntimeError(
                f"PORTFOLIO_REVIEW returned unparseable response: {(completion.content or '')[:240]}"
            )
        result["model"] = completion.model
        return result

    @staticmethod
    def _normalize(parsed: dict[str, Any] | list[Any] | None) -> dict[str, Any] | None:
        if not isinstance(parsed, dict):
            return None
        relevant = PortfolioReviewService._exp_list(
            parsed.get("relevant_experiences"), ("id", "title", "why_fits")
        )
        unused = PortfolioReviewService._exp_list(
            parsed.get("unused_experiences"), ("id", "title", "reason")
        )
        claims_raw = parsed.get("unsupported_claims")
        claims: list[dict[str, str]] = []
        if isinstance(claims_raw, list):
            for item in claims_raw:
                if not isinstance(item, dict):
                    continue
                claim = str(item.get("claim") or "").strip()
                reason = str(item.get("reason") or "").strip()
                if claim:
                    claims.append({"claim": claim, "reason": reason})
        dirs_raw = parsed.get("revision_directions")
        directions: list[str] = []
        if isinstance(dirs_raw, list):
            directions = [str(d).strip() for d in dirs_raw if str(d).strip()]
        return {
            "relevant_experiences": relevant,
            "unused_experiences": unused,
            "unsupported_claims": claims,
            "revision_directions": directions,
        }

    @staticmethod
    def _exp_list(raw: Any, keys: tuple[str, ...]) -> list[dict[str, str]]:
        if not isinstance(raw, list):
            return []
        out: list[dict[str, str]] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            row = {k: str(item.get(k) or "").strip() for k in keys}
            if row.get("id") or row.get("title"):
                out.append(row)
        return out


class SectionAnalysisService:
    """문항 제목만 구조화. 경험 ID는 고르지 않는다."""

    INTENTS = {
        "motivation", "growth", "competency", "career", "aspiration",
        "collaboration", "conflict", "leadership", "problem", "achievement", "other",
    }
    LOOK_FOR = {
        "PROJECT", "ACHIEVEMENT", "COLLABORATION", "CONFLICT_RESOLUTION",
        "PROBLEM_SOLVING", "LEADERSHIP", "TECHNOLOGY", "OTHER",
    }

    async def analyze(self, section_titles: list[str]) -> dict[str, Any]:
        titles = [str(t).strip() for t in (section_titles or []) if str(t).strip()][:5]
        if not titles:
            return {"sections": [], "model": None}
        if not await llm_service.has_routes("SECTION_ANALYSIS"):
            raise RuntimeError("LLM routes unavailable for SECTION_ANALYSIS")
        titles_text = "\n".join(f"{i + 1}. {title}" for i, title in enumerate(titles))
        prompt = await prompt_client.render("SECTION_ANALYSIS", {"section_titles": titles_text})
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "SECTION_ANALYSIS",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.1,
        )
        if not isinstance(parsed, dict):
            raise RuntimeError(
                f"SECTION_ANALYSIS returned unparseable response: {(completion.content or '')[:200]}"
            )
        return {
            "sections": self.normalize(titles, parsed),
            "model": completion.model,
        }

    @classmethod
    def normalize(cls, titles: list[str], parsed: dict[str, Any]) -> list[dict[str, Any]]:
        raw = parsed.get("sections")
        by_index: dict[int, dict[str, Any]] = {}
        if isinstance(raw, list):
            for item in raw:
                if not isinstance(item, dict):
                    continue
                try:
                    idx = int(item.get("index"))
                except (TypeError, ValueError):
                    continue
                by_index[idx] = item
        out: list[dict[str, Any]] = []
        for i, title in enumerate(titles):
            item = by_index.get(i) or {}
            intent = str(item.get("intent") or "other").strip().lower()
            if intent not in cls.INTENTS:
                intent = "other"
            look_raw = item.get("look_for")
            look_for: list[str] = []
            if isinstance(look_raw, list):
                for v in look_raw:
                    key = str(v or "").strip().upper()
                    if key in cls.LOOK_FOR and key not in look_for:
                        look_for.append(key)
            if not look_for:
                look_for = cls._default_look_for(intent)
            needs = item.get("needs_unique_story")
            if needs is None:
                needs = intent != "aspiration"
            max_n = item.get("max_experiences")
            try:
                max_experiences = int(max_n)
            except (TypeError, ValueError):
                max_experiences = 2 if intent in {"competency", "career"} else 1
            if max_experiences < 1:
                max_experiences = 1
            if intent == "career":
                needs = True
                max_experiences = min(3, max(2, max_experiences))
            elif max_experiences > 2:
                max_experiences = 2
            if intent == "aspiration":
                needs = False
                max_experiences = 1
            asks = str(item.get("asks") or "").strip()
            out.append({
                "index": i,
                "title": title,
                "intent": intent,
                "needs_unique_story": bool(needs),
                "max_experiences": max_experiences,
                "look_for": look_for,
                "asks": asks,
            })
        return out

    @staticmethod
    def _default_look_for(intent: str) -> list[str]:
        return {
            "motivation": ["ACHIEVEMENT", "PROJECT"],
            "growth": ["PROBLEM_SOLVING", "CONFLICT_RESOLUTION", "OTHER"],
            "competency": ["PROJECT", "TECHNOLOGY", "ACHIEVEMENT"],
            "career": ["PROJECT", "ACHIEVEMENT", "TECHNOLOGY"],
            "aspiration": ["OTHER"],
            "collaboration": ["COLLABORATION"],
            "conflict": ["CONFLICT_RESOLUTION"],
            "leadership": ["LEADERSHIP"],
            "problem": ["PROBLEM_SOLVING"],
            "achievement": ["ACHIEVEMENT"],
        }.get(intent, ["PROJECT", "OTHER"])


class HumanizeService:
    """제품 안의 AI 흔적 윤문. prompt-service AI_HUMANIZE(Skill 40패턴 + Rubric)."""

    MAX_SENTENCES = 40
    EMPTY_ANALYSIS = {
        "grade": "",
        "grade_reason": "",
        "s1": 0,
        "s2": 0,
        "s3": 0,
        "findings": [],
    }

    async def humanize(self, content: str, sentences: list[str] | None = None) -> dict[str, Any]:
        text = (content or "").strip()
        if not text:
            return {
                "content": "",
                "replacements": [],
                "changed_count": 0,
                "analysis": dict(self.EMPTY_ANALYSIS),
                "model": None,
            }
        if not await llm_service.has_routes("AI_HUMANIZE"):
            raise RuntimeError("LLM routes unavailable for AI_HUMANIZE")
        targets = self._normalize_targets(sentences)
        sentences_text = (
            "\n".join(f"- {s}" for s in targets)
            if targets
            else "(없음 — 본문 전체에서 AI 작문 티가 있는 문장)"
        )
        prompt = await prompt_client.render("AI_HUMANIZE", {
            "content": text,
            "sentences": sentences_text,
        })
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "AI_HUMANIZE",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.45,
        )
        raw = parsed.get("replacements") if isinstance(parsed, dict) else (
            parsed if isinstance(parsed, list) else None
        )
        if not isinstance(raw, list):
            raise RuntimeError(
                f"AI_HUMANIZE returned unparseable response: {(completion.content or '')[:200]}"
            )
        next_content, applied = self.apply_replacements(text, raw, targets or None)
        analysis = self.parse_analysis(parsed if isinstance(parsed, dict) else {})
        return {
            "content": next_content,
            "replacements": applied,
            "changed_count": len(applied),
            "analysis": analysis,
            "model": completion.model,
        }

    @classmethod
    def parse_analysis(cls, parsed: dict[str, Any]) -> dict[str, Any]:
        raw = parsed.get("analysis") if isinstance(parsed, dict) else None
        if not isinstance(raw, dict):
            return dict(cls.EMPTY_ANALYSIS)
        findings: list[dict[str, Any]] = []
        for item in raw.get("findings") or []:
            if not isinstance(item, dict):
                continue
            severity = str(item.get("severity") or "").strip().upper()
            if severity not in {"S1", "S2", "S3"}:
                continue
            title = str(item.get("title") or "").strip()
            example = str(item.get("example") or "").strip()
            why = str(item.get("why") or "").strip()
            if not title and not example:
                continue
            pattern_raw = item.get("pattern")
            try:
                pattern = int(pattern_raw) if pattern_raw is not None and str(pattern_raw).strip() != "" else None
            except (TypeError, ValueError):
                pattern = None
            findings.append({
                "pattern": pattern,
                "severity": severity,
                "title": title,
                "example": example,
                "why": why,
            })
        order = {"S1": 0, "S2": 1, "S3": 2}
        findings.sort(key=lambda f: (order.get(str(f["severity"]), 9), f.get("pattern") or 99))
        s1 = sum(1 for f in findings if f["severity"] == "S1")
        s2 = sum(1 for f in findings if f["severity"] == "S2")
        s3 = sum(1 for f in findings if f["severity"] == "S3")
        grade = str(raw.get("grade") or "").strip().upper()
        if grade not in {"A", "B", "C", "D"}:
            if s1 == 0 and s2 <= 2:
                grade = "A"
            elif s1 <= 2 and s2 <= 5:
                grade = "B"
            elif s1 >= 5 and s2 >= 8:
                grade = "D"
            else:
                grade = "C"
        return {
            "grade": grade,
            "grade_reason": str(raw.get("grade_reason") or "").strip(),
            "s1": s1,
            "s2": s2,
            "s3": s3,
            "findings": findings,
        }

    @classmethod
    def _normalize_targets(cls, sentences: list[str] | None) -> list[str]:
        out: list[str] = []
        for item in sentences or []:
            s = str(item or "").strip()
            if s and s not in out:
                out.append(s)
            if len(out) >= cls.MAX_SENTENCES:
                break
        return out

    @staticmethod
    def _locate(content: str, original: str) -> str | None:
        text = (original or "").strip()
        if not text:
            return None
        if text in content:
            return text
        collapsed = " ".join(text.split())
        if collapsed != text and collapsed in content:
            return collapsed
        return None

    @staticmethod
    def apply_replacements(
        content: str,
        replacements: list[Any],
        targets: list[str] | None = None,
    ) -> tuple[str, list[dict[str, str]]]:
        allowed = {s.strip() for s in (targets or []) if str(s).strip()}
        next_content = content
        applied: list[dict[str, str]] = []
        seen: set[str] = set()
        for item in replacements:
            if not isinstance(item, dict):
                continue
            original = str(item.get("original") or "").strip()
            revised = str(item.get("revised") or "").strip()
            reason = str(item.get("reason") or "").strip()
            if not original or not revised or original == revised:
                continue
            match = HumanizeService._locate(next_content, original)
            if match is None:
                continue
            if allowed and original not in allowed and match not in allowed:
                continue
            if match in seen:
                continue
            next_content = next_content.replace(match, revised, 1)
            seen.add(match)
            applied.append({
                "original": match,
                "revised": revised,
                "reason": reason,
            })
        return next_content, applied


class ExperienceCoachService:
    """대화로 경험 draft를 정리한다. 사실 추가 금지."""

    EXPERIENCE_TYPES = {
        "PROJECT", "ACHIEVEMENT", "COLLABORATION", "CONFLICT_RESOLUTION",
        "PROBLEM_SOLVING", "LEADERSHIP", "TECHNOLOGY", "OTHER",
    }

    async def coach(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not await llm_service.has_routes("EXPERIENCE_CHAT"):
            raise RuntimeError("LLM routes unavailable for EXPERIENCE_CHAT")

        mode = str(payload.get("mode") or "create")
        user_message = str(payload.get("user_message") or "").strip()
        if not user_message:
            raise RuntimeError("user_message is required")

        current_draft = payload.get("current_draft")
        if not isinstance(current_draft, dict):
            current_draft = {}

        history_raw = payload.get("chat_history")
        history_lines: list[str] = []
        if isinstance(history_raw, list):
            for item in history_raw[-20:]:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role") or "user")
                content = str(item.get("content") or "").strip()
                if content:
                    prefix = "나" if role == "user" else "도우미"
                    history_lines.append(f"{prefix}: {content}")

        existing = payload.get("existing_experience")
        existing_block = ""
        if isinstance(existing, dict) and existing:
            existing_block = "기존 경험 (JSON):\n" + json.dumps(existing, ensure_ascii=False, indent=2)

        variables = {
            "mode": mode,
            "existing_experience_block": existing_block or "(없음)",
            "current_draft_json": json.dumps(current_draft, ensure_ascii=False, indent=2),
            "chat_history": "\n".join(history_lines) if history_lines else "(없음)",
            "user_message": user_message,
        }
        prompt = await prompt_client.render("EXPERIENCE_COACH", variables)
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "EXPERIENCE_CHAT",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.35,
        )
        if not isinstance(parsed, dict):
            raise RuntimeError(
                f"EXPERIENCE_CHAT returned unparseable response: {(completion.content or '')[:200]}"
            )
        return {
            "reply": str(parsed.get("reply") or "").strip(),
            "draft": self.normalize_draft(parsed.get("draft")),
            "missingFields": self.normalize_missing(parsed.get("missingFields")),
            "model": completion.model,
        }

    @classmethod
    def normalize_draft(cls, raw: Any) -> dict[str, Any]:
        if not isinstance(raw, dict):
            return {}
        out: dict[str, Any] = {}
        for key in (
            "type", "title", "description", "role", "contribution", "result",
            "numericResult", "starSituation", "starTask", "starAction", "starResult",
            "startDate", "endDate",
        ):
            val = raw.get(key)
            if val is not None and str(val).strip():
                out[key] = str(val).strip()
        exp_type = str(out.get("type") or "PROJECT").strip().upper()
        out["type"] = exp_type if exp_type in cls.EXPERIENCE_TYPES else "PROJECT"
        skills_raw = raw.get("skills")
        skills: list[str] = []
        if isinstance(skills_raw, list):
            for s in skills_raw:
                name = str(s or "").strip()
                if name and name not in skills:
                    skills.append(name)
        out["skills"] = skills
        return out

    @staticmethod
    def normalize_missing(raw: Any) -> list[str]:
        if not isinstance(raw, list):
            return []
        return [str(v).strip() for v in raw if str(v or "").strip()]


class HelpChatService:
    """공개 FAQ·사용법 안내. 지식 밖의 내용은 지어내지 않는다."""

    async def chat(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not await llm_service.has_routes("HELP_CHAT"):
            raise RuntimeError("LLM routes unavailable for HELP_CHAT")

        user_message = str(payload.get("user_message") or "").strip()
        if not user_message:
            raise RuntimeError("user_message is required")

        knowledge = str(payload.get("knowledge") or "").strip()
        page_context = str(payload.get("page_context") or "").strip()
        history_raw = payload.get("chat_history")
        history_lines: list[str] = []
        if isinstance(history_raw, list):
            for item in history_raw[-6:]:
                if not isinstance(item, dict):
                    continue
                role = str(item.get("role") or "user")
                content = str(item.get("content") or "").strip()
                if content:
                    prefix = "사용자" if role == "user" else "안내"
                    history_lines.append(f"{prefix}: {content}")

        variables = {
            "knowledge": knowledge or "(지식 없음)",
            "page_context": page_context or "(현재 화면 정보 없음)",
            "chat_history": "\n".join(history_lines) if history_lines else "(없음)",
            "user_message": user_message,
        }
        prompt = await prompt_client.render("HELP_CHAT", variables)
        parsed, completion = await llm_service.complete_json_value_for_operation(
            "HELP_CHAT",
            prompt["system_prompt"],
            prompt["user_prompt"],
            temperature=0.3,
        )
        if not isinstance(parsed, dict):
            raise RuntimeError(
                f"HELP_CHAT returned unparseable response: {(completion.content or '')[:200]}"
            )
        reply = str(parsed.get("reply") or "").strip()
        citations_raw = parsed.get("citations")
        citations: list[str] = []
        if isinstance(citations_raw, list):
            for v in citations_raw[:3]:
                s = str(v or "").strip()
                if s:
                    citations.append(s)
        return {
            "reply": reply,
            "citations": citations,
            "model": completion.model,
        }


generation_service = GenerationService()
detection_service = DetectionService()
humanize_service = HumanizeService()
review_service = ReviewService()
interview_service = InterviewService()
keyword_service = KeywordService()
portfolio_review_service = PortfolioReviewService()
section_analysis_service = SectionAnalysisService()
experience_coach_service = ExperienceCoachService()
help_chat_service = HelpChatService()
