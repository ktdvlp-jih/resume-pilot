import logging
from typing import Any

from app.clients.service_clients import prompt_client, rag_client
from app.services.llm_service import llm_service, rule_based

logger = logging.getLogger(__name__)


class GenerationService:
    async def generate_resume(self, request: dict[str, Any]) -> dict[str, Any]:
        user_id = request["user_id"]
        keywords = request.get("keywords", [])
        rewrite_level = request.get("rewrite_level", 40)
        job_analysis = request.get("job_analysis")

        rag_context: dict[str, Any] = {"context": {"experiences": [], "writing_styles": []}}
        try:
            rag_context = await rag_client.build_context(user_id, keywords, job_analysis)
        except Exception as exc:
            logger.warning("RAG context build failed: %s", exc)
        experiences = rag_context.get("context", {}).get("experiences", [])
        writing_styles = rag_context.get("context", {}).get("writing_styles", [])
        style_text = writing_styles[0].get("content", "") if writing_styles else ""
        try:
            prompt = await prompt_client.render("RESUME_GENERATION", {
                "experiences": str(experiences),
                "job_analysis": str(job_analysis),
                "writing_style": style_text,
                "rewrite_level": rewrite_level,
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

        result = llm_service.generate_with_context(
            experiences=experiences,
            rewrite_level=rewrite_level,
            job_analysis=job_analysis,
            writing_style=style_text,
            system_prompt=prompt["system_prompt"],
            user_prompt=prompt["user_prompt"],
        )

        forbidden = request.get("forbidden_expressions", [])
        if forbidden and result.get("content"):
            result["content"] = self._apply_forbidden(str(result["content"]), forbidden)

        detections = rule_based.detect_ai_traces(result["content"], forbidden) if not result.get("insufficient") else []
        reviews = rule_based.review_feedback(result["content"]) if not result.get("insufficient") else []

        return {
            **result,
            "rewrite_level": rewrite_level,
            "quality_scores": self._score(result["content"], detections),
            "detections": detections,
            "reviews": reviews,
        }

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
    def detect(self, content: str, forbidden: list[str] | None = None) -> dict[str, Any]:
        detections = rule_based.detect_ai_traces(content, forbidden)
        red = sum(1 for d in detections if d["level"] == "RED")
        total = max(len(detections), 1)
        return {
            "detections": detections,
            "ai_trace_percent": round(red / total * 100, 1),
        }


class ReviewService:
    def review(self, content: str, job_analysis: dict | None = None) -> dict[str, Any]:
        return {"reviews": rule_based.review_feedback(content), "job_analysis": job_analysis}


class InterviewService:
    def generate(self, content: str) -> list[dict]:
        categories = ["지원동기", "협업", "갈등 해결", "성과", "프로젝트", "기술", "심화", "압박"]
        return [
            {"category": cat, "question": f"{cat} 관련하여 자기소개서 내용을 바탕으로 설명해주세요.", "difficulty": "NORMAL"}
            for cat in categories
        ]


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
        }


generation_service = GenerationService()
detection_service = DetectionService()
review_service = ReviewService()
interview_service = InterviewService()
keyword_service = KeywordService()
