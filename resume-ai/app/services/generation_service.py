import logging
from typing import Any

from langchain_core.runnables import RunnableLambda

from app.clients.service_clients import prompt_client, rag_client
from app.services.llm_service import RULE_BASED_MODEL, llm_service, rule_based

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
        experiences = state["experiences"]
        style_text = state["style_text"]
        job_analysis = request.get("job_analysis")
        rewrite_level = request.get("rewrite_level", 40)
        section_titles = request.get("section_titles") or []
        section_titles_text = (
            "\n".join(f"{i + 1}. {title}" for i, title in enumerate(section_titles))
            if section_titles else ""
        )
        try:
            prompt = await prompt_client.render("RESUME_GENERATION", {
                "experiences": str(experiences),
                "job_analysis": str(job_analysis),
                "writing_style": style_text,
                "rewrite_level": rewrite_level,
                "section_titles": section_titles_text,
            })
        except Exception as exc:
            logger.warning("Prompt render failed: %s", exc)
            prompt = {
                "system_prompt": "You rewrite cover letters using ONLY the user's provided experiences.",
                "user_prompt": (
                    f"Experiences:\n{experiences}\n\nJob:\n{job_analysis}\n\n"
                    f"Style:\n{style_text}\n\nRewrite level: {rewrite_level}%"
                ),
            }
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
        )
        return {**state, "result": result}

    async def _postprocess(self, state: dict[str, Any]) -> dict[str, Any]:
        request = state["request"]
        result = state["result"]
        rewrite_level = request.get("rewrite_level", 40)
        job_analysis = request.get("job_analysis")

        forbidden = request.get("forbidden_expressions", [])
        if forbidden and result.get("content"):
            result["content"] = self._apply_forbidden(str(result["content"]), forbidden)

        if result.get("insufficient"):
            detections: list[dict] = []
            reviews: list[dict] = []
            review_scores = None
            ai_trace_percent = 0.0
            detections_fallback = False
            reviews_fallback = False
        else:
            detection_result = await detection_service.detect(result["content"], forbidden)
            review_result = await review_service.review(result["content"], job_analysis)
            detections = detection_result["detections"]
            ai_trace_percent = detection_result["ai_trace_percent"]
            detections_fallback = detection_result.get("fallback", False)
            reviews = review_result["reviews"]
            review_scores = review_result.get("scores")
            reviews_fallback = review_result.get("fallback", False)

        response = {
            **result,
            "rewrite_level": rewrite_level,
            "quality_scores": self._score(result["content"], ai_trace_percent, review_scores),
            "detections": detections,
            "detections_fallback": detections_fallback,
            "reviews": reviews,
            "reviews_fallback": reviews_fallback,
        }
        return {**state, "response": response}

    def _apply_forbidden(self, content: str, forbidden: list) -> str:
        for expr in forbidden:
            if expr and str(expr) in content:
                content = content.replace(str(expr), "")
        return content

    def _score(self, content: str, ai_trace_percent: float, review_scores: dict[str, Any] | None) -> dict[str, float]:
        naturalness = max(0, 100 - ai_trace_percent)
        if review_scores:
            return {
                "naturalness": naturalness,
                "company_fit": review_scores.get("company_fit", 0),
                "style_retention": review_scores.get("style_retention", 0),
                "ai_trace_percent": ai_trace_percent,
                "star_application": review_scores.get("star_application", 0),
                "experience_utilization": review_scores.get("experience_utilization", 0),
                "scored_by": "llm",
            }
        logger.warning("AI_REVIEW returned no usable scores, using rule-based fallback quality_scores")
        return {
            "naturalness": naturalness,
            "company_fit": 85.0,
            "style_retention": 90.0,
            "ai_trace_percent": ai_trace_percent,
            "star_application": 80.0,
            "experience_utilization": 95.0 if content else 0,
            "scored_by": "rule-based",
        }


class DetectionService:
    async def detect(self, content: str, forbidden: list[str] | None = None) -> dict[str, Any]:
        forbidden_lines = [e for e in (forbidden or []) if e]
        forbidden_text = (
            "금지 표현 목록:\n" + "\n".join(f"- {e}" for e in forbidden_lines)
            if forbidden_lines
            else ""
        )
        if await llm_service.has_routes("AI_DETECTION"):
            try:
                prompt = await prompt_client.render("AI_DETECTION", {
                    "content": content,
                    "forbidden_expressions": forbidden_text,
                })
                completion = await llm_service.complete_for_operation(
                    "AI_DETECTION",
                    prompt["system_prompt"],
                    prompt["user_prompt"],
                    temperature=0.2,
                )
                parsed = llm_service.parse_json_value(completion.content)
                detections = parsed if isinstance(parsed, list) else (
                    parsed.get("detections") if isinstance(parsed, dict) else None
                )
                if isinstance(detections, list) and detections:
                    red = sum(1 for d in detections if d.get("level") == "RED")
                    total = max(len(detections), 1)
                    return {
                        "detections": detections,
                        "ai_trace_percent": round(red / total * 100, 1),
                        "model": completion.model,
                        "fallback": False,
                    }
                logger.warning(
                    "AI_DETECTION returned unparseable/empty response, using rule fallback. raw=%.200s",
                    completion.content,
                )
            except Exception as exc:
                logger.warning("AI_DETECTION prompt failed, using rule fallback: %s", exc)

        detections = rule_based.detect_ai_traces(content, forbidden)
        red = sum(1 for d in detections if d["level"] == "RED")
        total = max(len(detections), 1)
        return {
            "detections": detections,
            "ai_trace_percent": round(red / total * 100, 1),
            "model": RULE_BASED_MODEL,
            "fallback": True,
        }


class ReviewService:
    async def review(self, content: str, job_analysis: dict | None = None) -> dict[str, Any]:
        if await llm_service.has_routes("AI_REVIEW"):
            try:
                prompt = await prompt_client.render("AI_REVIEW", {
                    "content": content,
                    "job_analysis": str(job_analysis or {}),
                })
                completion = await llm_service.complete_for_operation(
                    "AI_REVIEW",
                    prompt["system_prompt"],
                    prompt["user_prompt"],
                    temperature=0.3,
                )
                parsed = llm_service.parse_json_value(completion.content)
                reviews = parsed if isinstance(parsed, list) else (
                    parsed.get("reviews") if isinstance(parsed, dict) else None
                )
                scores = parsed.get("scores") if isinstance(parsed, dict) else None
                scores = scores if isinstance(scores, dict) else None
                if isinstance(reviews, list) and reviews:
                    return {
                        "reviews": reviews,
                        "scores": scores,
                        "job_analysis": job_analysis,
                        "model": completion.model,
                        "fallback": False,
                    }
                logger.warning(
                    "AI_REVIEW returned unparseable/empty response, using rule fallback. raw=%.200s",
                    completion.content,
                )
            except Exception as exc:
                logger.warning("AI_REVIEW prompt failed, using rule fallback: %s", exc)

        return {
            "reviews": rule_based.review_feedback(content),
            "scores": None,
            "job_analysis": job_analysis,
            "model": RULE_BASED_MODEL,
            "fallback": True,
        }


class InterviewService:
    CATEGORIES = ["지원동기", "협업", "갈등 해결", "성과", "프로젝트", "기술", "심화", "압박"]

    async def generate(self, content: str) -> dict[str, Any]:
        if await llm_service.has_routes("INTERVIEW_QUESTIONS"):
            try:
                prompt = await prompt_client.render("INTERVIEW_QUESTIONS", {"content": content})
                completion = await llm_service.complete_for_operation(
                    "INTERVIEW_QUESTIONS",
                    prompt["system_prompt"],
                    prompt["user_prompt"],
                    temperature=0.5,
                )
                parsed = llm_service.parse_json_value(completion.content)
                questions = parsed if isinstance(parsed, list) else (
                    parsed.get("questions") if isinstance(parsed, dict) else None
                )
                if isinstance(questions, list) and questions:
                    valid = [
                        q for q in questions
                        if isinstance(q, dict) and q.get("question")
                    ]
                    if valid:
                        return {
                            "questions": valid,
                            "model": completion.model,
                            "fallback": False,
                        }
                logger.warning(
                    "INTERVIEW_QUESTIONS returned unparseable/empty response, using rule fallback. raw=%.200s",
                    completion.content,
                )
            except Exception as exc:
                logger.warning("INTERVIEW_QUESTIONS prompt failed, using rule fallback: %s", exc)

        return {
            "questions": [
                {"category": cat, "question": f"{cat} 관련하여 자기소개서 내용을 바탕으로 설명해주세요.", "difficulty": "NORMAL"}
                for cat in self.CATEGORIES
            ],
            "model": RULE_BASED_MODEL,
            "fallback": True,
        }


class KeywordService:
    async def compare(self, job_keywords: list[str], resume_content: str) -> dict[str, Any]:
        if await llm_service.has_routes("KEYWORD_COMPARE"):
            try:
                prompt = await prompt_client.render("KEYWORD_COMPARE", {
                    "job_keywords": ", ".join(job_keywords),
                    "resume_content": resume_content,
                })
                completion = await llm_service.complete_for_operation(
                    "KEYWORD_COMPARE",
                    prompt["system_prompt"],
                    prompt["user_prompt"],
                    temperature=0.2,
                )
                parsed = llm_service.parse_json_response(completion.content)
                if parsed and isinstance(parsed.get("matched"), list) and isinstance(parsed.get("missing"), list):
                    return {
                        "matched": parsed["matched"],
                        "missing": parsed["missing"],
                        "recommended": parsed.get("recommended") if isinstance(parsed.get("recommended"), list) else [],
                        "overused": parsed.get("overused") if isinstance(parsed.get("overused"), list) else [],
                        "model": completion.model,
                        "fallback": False,
                    }
                logger.warning(
                    "KEYWORD_COMPARE returned unparseable response, using rule fallback. raw=%.200s",
                    completion.content,
                )
            except Exception as exc:
                logger.warning("KEYWORD_COMPARE prompt failed, using rule fallback: %s", exc)

        resume_words = set(resume_content.lower().split())
        job_set = set(k.lower() for k in job_keywords)
        matched = job_set & resume_words
        missing = job_set - resume_words
        return {
            "matched": list(matched),
            "missing": list(missing),
            "recommended": list(missing)[:5],
            "overused": [],
            "model": RULE_BASED_MODEL,
            "fallback": True,
        }


generation_service = GenerationService()
detection_service = DetectionService()
review_service = ReviewService()
interview_service = InterviewService()
keyword_service = KeywordService()
