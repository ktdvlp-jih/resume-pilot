from unittest.mock import AsyncMock, patch

import pytest

from app.services.job_analysis_service import job_analysis_service
from app.services.llm_service import RULE_BASED_MODEL


@pytest.mark.asyncio
async def test_text_analysis_without_llm_routes_uses_rule_based_model():
    text = """
    [테스트소프트] 백엔드 개발자
    필수사항:
    - Java, Spring
    우대사항:
    - React
    """
    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=False)):
        result = await job_analysis_service.analyze("TEXT", text)

    assert result.get("model") == RULE_BASED_MODEL
    assert result.get("extraction_method") == "text+rule"


@pytest.mark.asyncio
async def test_text_analysis_with_llm_sets_model():
    text = """
    [테스트소프트] 백엔드 개발자
    필수사항:
    - Java, Spring
    우대사항:
    - React
    """
    llm_payload = {
        "company_name": "테스트소프트",
        "position": "백엔드 개발자",
        "qualifications": [],
        "required_skills": ["Java", "Spring"],
        "preferred_skills": ["React"],
        "tech_keywords": ["java", "spring", "react"],
        "job_responsibilities": [],
        "talent_profile": [],
        "core_competencies": [],
        "org_culture": None,
        "job_description": "백엔드 채용",
    }

    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=True)):
        with patch.object(job_analysis_service, "_extract_with_llm", AsyncMock(return_value=(llm_payload, "gpt-4o-mini"))):
            result = await job_analysis_service.analyze("TEXT", text)

    assert result.get("model") == "gpt-4o-mini"
    assert result.get("extraction_method") == "text+llm"


@pytest.mark.asyncio
async def test_text_analysis_llm_json_parse_fail_falls_back_to_rule_based():
    text = "[테스트소프트] Java 개발자 채용"

    with patch.object(job_analysis_service, "_can_use_llm", AsyncMock(return_value=True)):
        with patch.object(
            job_analysis_service,
            "_extract_with_llm",
            AsyncMock(return_value=(None, "gpt-4o-mini")),
        ):
            result = await job_analysis_service.analyze("TEXT", text)

    assert result.get("model") == RULE_BASED_MODEL
    assert result.get("extraction_method") == "text+rule"
