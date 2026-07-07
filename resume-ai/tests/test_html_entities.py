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
    result = await job_analysis_service.analyze("TEXT", text)
    competencies = " ".join(result.get("core_competencies", []))
    assert "R&D" in competencies or "R&D" in result.get("raw_content", "")
    assert "&amp;" not in competencies


@pytest.mark.asyncio
async def test_tech_keywords_skip_css_font_noise():
    text = """
    직무: 백엔드 개발자
    필수: Java, Spring, React
    Pretendard BlinkMacSystemFont Roboto Helvetica
    """
    result = await job_analysis_service.analyze("TEXT", text)
    keywords = [k.lower() for k in result.get("tech_keywords", [])]
    assert "java" in keywords
    assert "pretendard" not in keywords
    assert "blinkmacsystemfont" not in keywords
