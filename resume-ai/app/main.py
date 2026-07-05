from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.core.response import ApiResponse
from app.services.company_analysis_service import company_analysis_service
from app.services.generation_service import (
    detection_service,
    generation_service,
    interview_service,
    keyword_service,
    review_service,
)
from app.services.job_analysis_service import job_analysis_service
from app.services.writing_style_service import writing_style_service

app = FastAPI(title="ResumePilot AI Gateway", version="0.1.0")


class GenerateRequest(BaseModel):
    user_id: str
    keywords: list[str] = []
    rewrite_level: int = Field(default=40, ge=0, le=100)
    job_analysis: dict[str, Any] | None = None


class ContentRequest(BaseModel):
    content: str
    forbidden_expressions: list[str] = []


class ReviewRequest(BaseModel):
    content: str
    job_analysis: dict[str, Any] | None = None


class KeywordCompareRequest(BaseModel):
    job_keywords: list[str]
    resume_content: str


class JobAnalyzeRequest(BaseModel):
    source_type: str
    content: str
    source_url: str | None = None
    file_base64: str | None = None
    mime_type: str | None = None


class WritingStyleRequest(BaseModel):
    content: str


@app.get("/health")
async def health():
    return ApiResponse(data={"status": "ok"})


@app.post("/analyze/job-posting")
async def analyze_job_posting(request: JobAnalyzeRequest):
    result = await job_analysis_service.analyze(
        request.source_type, request.content, request.source_url,
        request.file_base64, request.mime_type,
    )
    enriched = company_analysis_service.enrich(result)
    return ApiResponse(data=enriched)


@app.post("/analyze/writing-style")
async def analyze_writing_style(request: WritingStyleRequest):
    return ApiResponse(data=writing_style_service.analyze(request.content))


@app.post("/generate/resume")
async def generate_resume(request: GenerateRequest):
    result = await generation_service.generate_resume(request.model_dump())
    return ApiResponse(data=result)


@app.post("/detect/ai-traces")
async def detect_ai_traces(request: ContentRequest):
    return ApiResponse(data=detection_service.detect(request.content, request.forbidden_expressions))


@app.post("/review/feedback")
async def review_feedback(request: ReviewRequest):
    return ApiResponse(data=review_service.review(request.content, request.job_analysis))


@app.post("/generate/interview-questions")
async def generate_interview_questions(request: ContentRequest):
    return ApiResponse(data={"questions": interview_service.generate(request.content)})


@app.post("/compare/keywords")
async def compare_keywords(request: KeywordCompareRequest):
    return ApiResponse(data=keyword_service.compare(request.job_keywords, request.resume_content))
