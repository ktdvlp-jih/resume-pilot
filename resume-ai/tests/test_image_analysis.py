import base64
import io
from unittest.mock import AsyncMock, patch

import pytest

from app.services.job_analysis_service import job_analysis_service


def _make_job_posting_png() -> str:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        pytest.skip("Pillow not installed")
    image = Image.new("RGB", (900, 700), color="white")
    draw = ImageDraw.Draw(image)
    lines = [
        "[테스트소프트] 백엔드 개발자 채용",
        "직무: Java Spring Boot 개발",
        "필수 사항:",
        "- Java, Spring, PostgreSQL",
        "- AWS, Docker 경험",
        "우대 사항:",
        "- Kafka, Kubernetes",
    ]
    y = 40
    for line in lines:
        draw.text((40, y), line, fill="black")
        y += 50
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.mark.asyncio
async def test_image_ocr_extracts_company_and_skills():
    b64 = _make_job_posting_png()
    result = await job_analysis_service.analyze("IMAGE", "", file_base64=b64, mime_type="image/png")

    if result.get("error") == "empty content":
        pytest.skip("tesseract OCR unavailable or could not read synthetic image")

    assert result.get("company_name") != "Unknown" or result.get("tech_keywords")
    keywords = [k.lower() for k in result.get("tech_keywords", [])]
    assert "java" in keywords or "spring" in keywords or result.get("required_skills")
    assert result.get("extraction_method") in ("ocr", "ocr+llm", "vision")
    assert result.get("raw_content")


@pytest.mark.asyncio
async def test_image_vision_first_when_llm_available():
    b64 = _make_job_posting_png()
    vision_payload = {
        "company_name": "비전테크",
        "position": "프론트엔드 개발자",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["React", "TypeScript"],
        "preferred_skills": ["Next.js"],
        "tech_keywords": ["react", "typescript", "next.js"],
        "job_responsibilities": ["웹 서비스 개발"],
        "talent_profile": ["협업"],
        "core_competencies": ["문제 해결"],
        "org_culture": None,
        "job_description": "React 기반 서비스 개발",
    }

    with patch("app.services.job_analysis_service.settings") as mock_settings:
        mock_settings.openai_api_key = "test-key"
        mock_settings.internal_api_token = "test-token"
        with patch("app.services.job_analysis_service.llm_service") as mock_llm:
            mock_llm.has_routes = AsyncMock(return_value=True)
            mock_llm.complete_with_image_json_for_operation = AsyncMock(
                return_value=(vision_payload, "gemini-2.5-flash"),
            )
            with patch.object(job_analysis_service, "_extract_image_text") as mock_ocr:
                result = await job_analysis_service.analyze("IMAGE", "", file_base64=b64, mime_type="image/png")

    assert result["company_name"] == "비전테크"
    assert result["extraction_method"] == "vision"
    mock_ocr.assert_not_called()


@pytest.mark.asyncio
async def test_image_vision_fallback_when_ocr_empty():
    b64 = _make_job_posting_png()
    vision_payload = {
        "company_name": "비전테크",
        "position": "프론트엔드 개발자",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["React", "TypeScript"],
        "preferred_skills": ["Next.js"],
        "tech_keywords": ["react", "typescript", "next.js"],
        "job_responsibilities": ["웹 서비스 개발"],
        "talent_profile": ["협업"],
        "core_competencies": ["UI 개발"],
        "org_culture": None,
        "job_description": "React 기반 서비스 개발",
    }

    with patch.object(job_analysis_service, "_extract_image_text", return_value=""):
        with patch("app.services.job_analysis_service.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.internal_api_token = "test-token"
            with patch("app.services.job_analysis_service.llm_service") as mock_llm:
                mock_llm.has_routes = AsyncMock(return_value=True)
                mock_llm.complete_with_image_json_for_operation = AsyncMock(
                    return_value=(vision_payload, "gemini-2.5-flash"),
                )
                result = await job_analysis_service.analyze("IMAGE", "", file_base64=b64, mime_type="image/png")

    assert result["company_name"] == "비전테크"
    assert result["extraction_method"] == "vision"
    assert "react" in result["tech_keywords"]


@pytest.mark.asyncio
async def test_sparse_ocr_enriched_by_llm():
    sparse_text = """
    This is corrupted OCR header text that is too long to be a company name
    직무: ??? 개발자
    필수 Java Spr1ng BO0T
    """
    llm_payload = {
        "company_name": "모바일캡처",
        "position": "백엔드 엔지니어",
        "qualifications": ["관련 경력 3년 이상"],
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
        "preferred_skills": ["Docker", "AWS"],
        "tech_keywords": ["python", "fastapi", "postgresql", "docker", "aws"],
        "job_responsibilities": ["API 개발"],
        "talent_profile": [],
        "core_competencies": ["API 설계"],
        "org_culture": None,
        "job_description": "백엔드 API 개발",
    }

    with patch("app.services.job_analysis_service.settings") as mock_settings:
        mock_settings.openai_api_key = "test-key"
        mock_settings.internal_api_token = "test-token"
        with patch("app.services.job_analysis_service.llm_service") as mock_llm:
            mock_llm.has_routes = AsyncMock(return_value=True)
            mock_llm.complete_json_for_operation = AsyncMock(
                return_value=(llm_payload, "gemini-2.5-flash"),
            )
            result = await job_analysis_service.analyze("TEXT", sparse_text)

    assert result["company_name"] == "모바일캡처"
    assert "Python" in result["required_skills"]
    assert result.get("extraction_method") == "text+llm"


def test_merge_extraction_fills_missing_fields():
    base = {
        "company_name": "Unknown",
        "position": None,
        "required_skills": [],
        "preferred_skills": [],
        "tech_keywords": [],
        "talent_profile": [],
        "core_competencies": [],
        "job_description": None,
        "org_culture": None,
    }
    llm = {
        "company_name": "테스트소프트",
        "position": "Java 개발자",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["Java", "Spring"],
        "preferred_skills": ["AWS"],
        "tech_keywords": ["java", "spring", "aws"],
        "job_responsibilities": ["서버 개발"],
        "talent_profile": ["협업"],
        "core_competencies": ["백엔드 개발"],
        "job_description": "서버 개발",
        "org_culture": None,
        "raw_content": "서버 개발",
    }
    merged = job_analysis_service._merge_extraction(base, llm)
    assert merged["company_name"] == "테스트소프트"
    assert merged["position"] == "Java 개발자"
    assert "Java" in merged["required_skills"]
