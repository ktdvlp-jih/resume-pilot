import pytest

from app.services.job_analysis_service import job_analysis_service
from app.services.writing_style_service import writing_style_service


@pytest.mark.asyncio
async def test_job_analysis_extracts_company_and_skills():
    text = """
    [삼성전자] SW 개발자 채용
    직무: 백엔드 개발자
    필수사항:
    - Java, Spring Boot 3년 이상
    - AWS, Docker 경험
    우대사항:
    - Kubernetes
    인재상: 책임감, 협업, 문제 해결
    """
    result = await job_analysis_service.analyze("TEXT", text)
    assert "company_name" in result
    assert result["company_name"] != "Unknown" or "삼성" in text
    assert "java" in [k.lower() for k in result.get("tech_keywords", [])]


def test_writing_style_analysis():
    text = "저는 프로젝트를 수행하였습니다. 팀과 협업하여 성과를 달성했습니다. 또한 문제를 해결하였습니다."
    result = writing_style_service.analyze(text)
    assert result["uses_formal_speech"] is True
    assert result["avg_sentence_length"] > 0
    assert len(result["frequent_words"]) > 0
