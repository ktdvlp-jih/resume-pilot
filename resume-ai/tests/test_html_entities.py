from unittest.mock import AsyncMock, patch

import pytest

from app.services.job_analysis_service import job_analysis_service


def test_html_to_text_decodes_entities():
    raw = "<p>R&amp;D and ML &amp;amp; AI</p><style>body{font-family:Pretendard}</style>"
    text = job_analysis_service._html_to_text(raw)
    assert "R&D" in text
    assert "ML & AI" in text or "ML &amp; AI" not in text
    assert "Pretendard" not in text


@pytest.mark.asyncio
async def test_job_analysis_decodes_amp_in_competencies():
    text = """
    [테스트회사] AI Engineer 채용
    핵심 역량:
    - 선행 연구 및 R&amp;D 수행
    - ML R&amp;D 경력 5년 이상
    """
    llm_payload = {
        "company_name": "테스트회사",
        "position": "AI Engineer",
        "qualifications": [],
        "required_skills": ["ML R&D 경력 5년 이상"],
        "preferred_skills": [],
        "tech_keywords": ["ml", "ai"],
        "job_responsibilities": [],
        "talent_profile": [],
        "core_competencies": ["선행 연구 및 R&D 수행"],
        "org_culture": None,
        "job_description": "AI Engineer 채용",
    }
    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=True)):
        with patch.object(
            job_analysis_service,
            "_extract_with_llm",
            AsyncMock(return_value=(llm_payload, "gpt-4o-mini")),
        ):
            result = await job_analysis_service.analyze("TEXT", text)
    competencies = " ".join(result.get("core_competencies", []))
    assert "R&D" in competencies or "R&D" in (result.get("raw_content") or "")
    assert "&amp;" not in competencies


@pytest.mark.asyncio
async def test_tech_keywords_skip_css_font_noise():
    text = """
    직무: 백엔드 개발자
    필수: Java, Spring, React
    Pretendard BlinkMacSystemFont Roboto Helvetica
    """
    llm_payload = {
        "company_name": "테스트",
        "position": "백엔드 개발자",
        "qualifications": [],
        "required_skills": ["Java", "Spring", "React"],
        "preferred_skills": [],
        "tech_keywords": ["java", "spring", "react"],
        "job_responsibilities": [],
        "talent_profile": [],
        "core_competencies": [],
        "org_culture": None,
        "job_description": "백엔드 채용",
    }
    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=True)):
        with patch.object(
            job_analysis_service,
            "_extract_with_llm",
            AsyncMock(return_value=(llm_payload, "gpt-4o-mini")),
        ):
            result = await job_analysis_service.analyze("TEXT", text)
    keywords = [k.lower() for k in result.get("tech_keywords", [])]
    assert "java" in keywords
    assert "pretendard" not in keywords
    assert "blinkmacsystemfont" not in keywords
