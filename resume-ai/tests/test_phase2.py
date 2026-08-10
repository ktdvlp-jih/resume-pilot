from unittest.mock import AsyncMock, patch

import pytest

from app.services.job_analysis_service import job_analysis_service
from app.services.writing_style_service import writing_style_service


@pytest.mark.asyncio
async def test_job_analysis_requires_llm():
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
    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=False)):
        with pytest.raises(RuntimeError, match="JOB_ANALYSIS"):
            await job_analysis_service.analyze("TEXT", text)


@pytest.mark.asyncio
async def test_job_analysis_extracts_company_and_skills_via_llm():
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
    llm_payload = {
        "company_name": "삼성전자",
        "position": "백엔드 개발자",
        "qualifications": [],
        "required_skills": ["Java, Spring Boot 3년 이상", "AWS, Docker 경험"],
        "preferred_skills": ["Kubernetes"],
        "tech_keywords": ["java", "spring", "aws", "docker", "kubernetes"],
        "job_responsibilities": [],
        "talent_profile": ["책임감", "협업", "문제 해결"],
        "core_competencies": [],
        "org_culture": None,
        "job_description": "SW 개발자 채용",
    }
    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=True)):
        with patch.object(
            job_analysis_service,
            "_extract_with_llm",
            AsyncMock(return_value=(llm_payload, "gpt-4o-mini")),
        ):
            result = await job_analysis_service.analyze("TEXT", text)

    assert result["company_name"] == "삼성전자"
    assert "java" in [k.lower() for k in result.get("tech_keywords", [])]
    assert result.get("extraction_method") == "text+llm"


def test_writing_style_analysis():
    text = "저는 프로젝트를 수행하였습니다. 팀과 협업하여 성과를 달성했습니다. 또한 문제를 해결하였습니다."
    result = writing_style_service.analyze(text)
    assert result["uses_formal_speech"] is True
    assert result["avg_sentence_length"] > 0
    assert len(result["frequent_words"]) > 0
