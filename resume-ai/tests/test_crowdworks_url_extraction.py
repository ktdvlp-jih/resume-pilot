import asyncio

import pytest

from app.services.job_analysis_service import job_analysis_service
from app.services.job_extraction_postprocess import postprocess_extraction

CROWDWORKS_SNIPPET = """
※ 주요업무
AI 비즈니스의 다양한 기술적 문제 해결 (문서 파싱 영역의 챌린지 및 AI 응용 전반)
AI Native 소프트웨어 엔지니어링 방식을 업무에 적극 도입 및 활용
문제 해결을 위해 영역을 넘나드는 엔지니어링 접근 (도구는 수단)
필요에 따라 선행 연구 검토 및 R&D 수행 (연구는 수단, 문제 해결이 목표)
실험·업무 이력의 문서화 및 팀 내 지식 공유

※ 지원 자격
ML R&D 또는 소프트웨어 엔지니어링 관련 경력 5년 이상
단일 상품을 2년 이상 지속적으로 개발·개선한 경험
프로덕션 레벨에서 모델을 배포하고 운영한 경험
선행 연구를 발굴·검토하여 실제 구현으로 연구 목적을 달성한 경험
논문과 구현 간의 실무적 차이를 이해하고 직접 극복한 경험

※ 우대요건
AI·ML 관련 석사 이상 학위, 또는 동일 주제로 1년 이상 R&D를 통해 의미 있는 성과를 만든 경험
LLM Agent 기반 시스템 구현 경험 (멀티 에이전트, 툴 호출, 오케스트레이션 등)
추론 최적화(vLLM, TensorRT-LLM, Quantization 등) 기반 레이턴시·성능 튜닝 경험
"""


def test_rule_extractor_finds_support_qualification_section():
    extracted = job_analysis_service._extract_from_text(CROWDWORKS_SNIPPET)
    assert len(extracted["required_skills"]) >= 3
    assert any("경력 5년" in item for item in extracted["required_skills"])
    assert len(extracted["preferred_skills"]) >= 2
    assert any("LLM Agent" in item for item in extracted["preferred_skills"])


def test_postprocess_recovers_required_when_llm_left_empty():
    raw = {
        "company_name": "크라우드웍스",
        "position": "AI 엔지니어",
        "qualifications": ["ML R&D 또는 소프트웨어 엔지니어링 관련 경력 5년 이상"],
        "required_skills": [],
        "preferred_skills": [],
        "job_responsibilities": ["AI 비즈니스의 다양한 기술적 문제 해결"],
        "tech_keywords": ["llm", "python"],
        "talent_profile": [],
        "core_competencies": [],
        "job_description": "AI 엔지니어 채용",
    }
    result = postprocess_extraction(raw, CROWDWORKS_SNIPPET)
    assert len(result["required_skills"]) >= 3
    assert len(result["preferred_skills"]) >= 2


@pytest.mark.asyncio
async def test_fetch_crowdworks_url_has_support_sections():
    text = await job_analysis_service._fetch_url(
        "https://crowdworks.career.greetinghr.com/ko/o/212871",
    )
    if not text:
        pytest.skip("network unavailable")
    assert "지원 자격" in text
    assert "우대요건" in text
    extracted = job_analysis_service._extract_from_text(text)
    assert len(extracted["required_skills"]) >= 3
    assert len(extracted["preferred_skills"]) >= 2
