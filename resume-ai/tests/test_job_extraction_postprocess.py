from app.services.job_extraction_postprocess import (
    clean_tech_keywords,
    has_ocr_garbage,
    is_qualification_item,
    ocr_is_low_quality,
    postprocess_extraction,
)


def test_ocr_is_low_quality_detects_garbage():
    text = "화학물질 및 환경안전보건 ㅁ1/ㅁ× 기업 AS Al Boot Ter SQL " * 3
    assert ocr_is_low_quality(text) is True


def test_postprocess_moves_education_to_qualifications():
    raw = {
        "company_name": "테스트소프트",
        "position": "백엔드 개발자",
        "required_skills": [
            "4년제 대학 졸업 이상",
            "Java / Spring Boot 기반 개발",
        ],
        "preferred_skills": ["React"],
        "tech_keywords": ["java", "AS", "Boot", "spring boot"],
        "job_responsibilities": ["CMS 신규 기능 개발"],
        "talent_profile": ["협업"],
        "core_competencies": [],
        "job_description": "백엔드 개발자 채용",
    }
    result = postprocess_extraction(raw, "Java Spring Boot CMS")
    assert any("대학" in item for item in result["qualifications"])
    assert any("Java" in item for item in result["required_skills"])
    assert "AS" not in result["tech_keywords"]
    assert "spring boot" in result["tech_keywords"] or "java" in result["tech_keywords"]


def test_clean_tech_keywords_filters_noise():
    keywords = ["java", "AS", "Boot", "spring boot", "Ter", "ms-sql"]
    cleaned = clean_tech_keywords(keywords, "Java Spring Boot MS-SQL")
    assert "java" in cleaned
    assert "AS" not in cleaned
    assert "Boot" not in cleaned


def test_has_ocr_garbage():
    assert has_ocr_garbage("화학물질 ㅁ1/ㅁ×") is True
    assert has_ocr_garbage("테스트소프트") is False


def test_is_qualification_item():
    assert is_qualification_item("4년제 대학 졸업 이상") is True
    assert is_qualification_item("Java / Spring 개발 경력 5년 이상") is True
    assert is_qualification_item("React/TypeScript") is False
