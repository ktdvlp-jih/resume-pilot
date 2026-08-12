import logging
from typing import Any

from langchain_core.runnables import RunnableLambda

from app.clients.service_clients import prompt_client, rag_client
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
        prompt = await prompt_client.render("RESUME_GENERATION", {
            "experiences": "{{experiences}}",
            "job_analysis": str(job_analysis),
            "writing_style": style_text,
            "rewrite_level": rewrite_level,
            "section_titles": section_titles_text,
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
        reviews = review_result["reviews"]
        review_scores = review_result.get("scores")

        response = {
            **result,
            "rewrite_level": rewrite_level,
            "quality_scores": self._score(result["content"], ai_trace_percent, review_scores),
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

    def _score(self, content: str, ai_trace_percent: float, review_scores: dict[str, Any] | None) -> dict[str, float]:
        naturalness = max(0, 100 - ai_trace_percent)
        if not review_scores:
            raise RuntimeError("AI_REVIEW returned no usable scores")
        return {
            "naturalness": naturalness,
            "company_fit": review_scores.get("company_fit", 0),
            "style_retention": review_scores.get("style_retention", 0),
            "ai_trace_percent": ai_trace_percent,
            "star_application": review_scores.get("star_application", 0),
            "experience_utilization": review_scores.get("experience_utilization", 0),
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
        red = sum(1 for d in detections if str(d.get("level", "")).upper() == "RED")
        total = max(len(detections), 1)
        return {
            "detections": detections,
            "ai_trace_percent": round(red / total * 100, 1) if detections else 0.0,
            "model": completion.model,
        }


class ReviewService:
    _SCORES_RETRY_HINT = (
        "\n\n[Retry] Previous reply omitted usable scores. "
        "Return ONE JSON object with BOTH non-empty \"reviews\" array AND \"scores\" object "
        "containing integer fields: company_fit, style_retention, star_application, experience_utilization."
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
            user + "\n\nInclude scores object with 0-100 integers.",
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
            for k in ("company_fit", "style_retention", "star_application", "experience_utilization")
        )
        return reviews, scores if usable else None


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


generation_service = GenerationService()
detection_service = DetectionService()
review_service = ReviewService()
interview_service = InterviewService()
keyword_service = KeywordService()
