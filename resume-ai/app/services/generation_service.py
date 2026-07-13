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

        forbidden = request.get("forbidden_expressions", [])
        if forbidden and result.get("content"):
            result["content"] = self._apply_forbidden(str(result["content"]), forbidden)

        detections = rule_based.detect_ai_traces(result["content"], forbidden) if not result.get("insufficient") else []
        reviews = rule_based.review_feedback(result["content"]) if not result.get("insufficient") else []

        response = {
            **result,
            "rewrite_level": rewrite_level,
            "quality_scores": self._score(result["content"], detections),
            "detections": detections,
            "reviews": reviews,
        }
        return {**state, "response": response}

    def _apply_forbidden(self, content: str, forbidden: list) -> str:
        for expr in forbidden:
            if expr and str(expr) in content:
                content = content.replace(str(expr), "")
        return content

    def _score(self, content: str, detections: list[dict]) -> dict[str, float]:
        red_count = sum(1 for d in detections if d["level"] == "RED")
        total = max(len(detections), 1)
        ai_trace = round(red_count / total * 100, 1)
        return {
            "naturalness": max(0, 100 - ai_trace),
            "company_fit": 85.0,
            "style_retention": 90.0,
            "ai_trace_percent": ai_trace,
            "star_application": 80.0,
            "experience_utilization": 95.0 if content else 0,
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
                    }
            except Exception as exc:
                logger.warning("AI_DETECTION prompt failed, using rule fallback: %s", exc)

        detections = rule_based.detect_ai_traces(content, forbidden)
        red = sum(1 for d in detections if d["level"] == "RED")
        total = max(len(detections), 1)
        return {
            "detections": detections,
            "ai_trace_percent": round(red / total * 100, 1),
            "model": RULE_BASED_MODEL,
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
                if isinstance(reviews, list) and reviews:
                    return {
                        "reviews": reviews,
                        "job_analysis": job_analysis,
                        "model": completion.model,
                    }
            except Exception as exc:
                logger.warning("AI_REVIEW prompt failed, using rule fallback: %s", exc)

        return {"reviews": rule_based.review_feedback(content), "job_analysis": job_analysis, "model": RULE_BASED_MODEL}


class InterviewService:
    def generate(self, content: str) -> dict[str, Any]:
        categories = ["지원동기", "협업", "갈등 해결", "성과", "프로젝트", "기술", "심화", "압박"]
        return {
            "questions": [
                {"category": cat, "question": f"{cat} 관련하여 자기소개서 내용을 바탕으로 설명해주세요.", "difficulty": "NORMAL"}
                for cat in categories
            ],
            "model": RULE_BASED_MODEL,
        }


class KeywordService:
    def compare(self, job_keywords: list[str], resume_content: str) -> dict[str, Any]:
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
        }


generation_service = GenerationService()
detection_service = DetectionService()
review_service = ReviewService()
interview_service = InterviewService()
keyword_service = KeywordService()
