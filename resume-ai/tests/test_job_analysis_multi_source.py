from unittest.mock import AsyncMock, patch

import pytest

from app.services.job_analysis_service import job_analysis_service
from app.services.job_extraction_postprocess import postprocess_extraction


URL_STYLE_HTML = """
<html><body>
<h1>넥스트게임즈</h1>
<h2>게임 서버 백엔드 엔지니어</h2>
<p>자격요건: 4년제 대학 졸업 이상, 관련 분야 경력 4년 이상</p>
<ul>
<li>필수: C++/Go 기반 게임 서버 개발, Redis·MySQL 운영</li>
<li>우대: Unreal Engine 연동 경험, 대규모 동시접속 서비스 운영</li>
</ul>
<p>담당업무: 매치메이킹 서버 개발, 실시간 패킷 처리 모듈 고도화</p>
</body></html>
"""

PDF_STYLE_TEXT = """
삼성카드 IT본부 채용
직무: 데이터 플랫폼 엔지니어
지원자격
- 4년제 대학 졸업 이상
- Java / Spring Boot 기반 백엔드 개발 경력 5년 이상
- 대용량 배치·스트리밍 파이프라인 설계 경험
우대사항
- Kafka, Spark, Airflow 활용 경험
- 금융권 데이터 플랫폼 구축 경험
주요업무
- 카드 승인/정산 데이터 파이프라인 운영
- 실시간 이벤트 스트리밍 아키텍처 고도화
"""


def test_postprocess_url_style_gaming_company():
    raw = {
        "company_name": "넥스트게임즈",
        "position": "게임 서버 백엔드 엔지니어",
        "qualifications": ["4년제 대학 졸업 이상", "관련 분야 경력 4년 이상"],
        "required_skills": ["C++/Go 기반 게임 서버 개발", "Redis·MySQL 운영"],
        "preferred_skills": ["Unreal Engine 연동 경험", "대규모 동시접속 서비스 운영"],
        "job_responsibilities": ["매치메이킹 서버 개발", "실시간 패킷 처리 모듈 고도화"],
        "tech_keywords": ["c++", "go", "redis", "mysql"],
        "talent_profile": ["도전"],
        "core_competencies": [],
        "job_description": "게임 서버 백엔드 채용",
    }
    result = postprocess_extraction(raw, URL_STYLE_HTML)
    assert result["company_name"] == "넥스트게임즈"
    assert any("대학" in item for item in result["qualifications"])
    assert any("C++" in item or "Go" in item for item in result["required_skills"])
    assert "redis" in [k.lower() for k in result["tech_keywords"]]


def test_postprocess_pdf_style_fintech_company():
    raw = {
        "company_name": "삼성카드",
        "position": "데이터 플랫폼 엔지니어",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": [
            "Java / Spring Boot 기반 백엔드 개발 경력 5년 이상",
            "대용량 배치·스트리밍 파이프라인 설계 경험",
        ],
        "preferred_skills": ["Kafka, Spark, Airflow 활용 경험", "금융권 데이터 플랫폼 구축 경험"],
        "job_responsibilities": [
            "카드 승인/정산 데이터 파이프라인 운영",
            "실시간 이벤트 스트리밍 아키텍처 고도화",
        ],
        "tech_keywords": ["java", "spring boot", "kafka", "spark"],
        "talent_profile": [],
        "core_competencies": [],
        "job_description": "데이터 플랫폼 엔지니어 채용",
    }
    result = postprocess_extraction(raw, PDF_STYLE_TEXT)
    assert result["company_name"] == "삼성카드"
    assert any("경력 5년" in item for item in result["qualifications"])
    assert any("Java" in item for item in result["required_skills"])
    assert "kafka" in [k.lower() for k in result["tech_keywords"]]


@pytest.mark.asyncio
async def test_text_source_runs_llm_pipeline():
    llm_payload = {
        "company_name": "넥스트게임즈",
        "position": "게임 서버 백엔드 엔지니어",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["C++/Go 기반 게임 서버 개발"],
        "preferred_skills": ["Unreal Engine 연동 경험"],
        "tech_keywords": ["c++", "go", "redis"],
        "job_responsibilities": ["매치메이킹 서버 개발"],
        "talent_profile": [],
        "core_competencies": [],
        "org_culture": None,
        "job_description": "게임 서버 개발",
    }

    with patch("app.services.job_analysis_service.settings") as mock_settings:
        mock_settings.openai_api_key = "test-key"
        mock_settings.internal_api_token = "test-token"
        with patch("app.services.job_analysis_service.llm_service") as mock_llm:
            mock_llm.has_routes = AsyncMock(return_value=True)
            mock_llm.complete_json_for_operation = AsyncMock(
                return_value=(llm_payload, "gemini-2.5-flash"),
            )
            result = await job_analysis_service.analyze("TEXT", URL_STYLE_HTML)

    assert result["company_name"] == "넥스트게임즈"
    assert result.get("extraction_method") == "text+llm"
    assert any("C++" in item or "Go" in item for item in result["required_skills"])


@pytest.mark.asyncio
async def test_url_source_runs_llm_pipeline():
    llm_payload = {
        "company_name": "삼성카드",
        "position": "데이터 플랫폼 엔지니어",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["Java / Spring Boot 기반 백엔드 개발 경력 5년 이상"],
        "preferred_skills": ["Kafka, Spark 활용 경험"],
        "tech_keywords": ["java", "spring boot", "kafka", "spark"],
        "job_responsibilities": ["데이터 파이프라인 운영"],
        "talent_profile": [],
        "core_competencies": [],
        "org_culture": None,
        "job_description": "데이터 플랫폼",
    }

    with patch.object(job_analysis_service, "_fetch_url", return_value=PDF_STYLE_TEXT):
        with patch("app.services.job_analysis_service.settings") as mock_settings:
            mock_settings.openai_api_key = "test-key"
            mock_settings.internal_api_token = "test-token"
            with patch("app.services.job_analysis_service.llm_service") as mock_llm:
                mock_llm.has_routes = AsyncMock(return_value=True)
                mock_llm.complete_json_for_operation = AsyncMock(
                    return_value=(llm_payload, "gemini-2.5-flash"),
                )
                result = await job_analysis_service.analyze(
                    "URL",
                    "",
                    source_url="https://example.com/jobs/data-platform",
                )

    assert result["company_name"] == "삼성카드"
    assert result.get("extraction_method") == "url+llm"
    assert any("경력 5년" in item for item in result.get("qualifications", []))
