from app.services.job_extraction_postprocess import (
    build_source_blob,
    clean_tech_keywords,
    enrich_tech_keywords,
    has_ocr_garbage,
    is_qualification_item,
    is_quality_result,
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


def test_enrich_tech_keywords_from_preferred_skills():
    raw = {
        "tech_keywords": ["java", "spring"],
        "preferred_skills": [
            "ERP / SAP 등 기간계 시스템 연동(I/F) 개발 경험",
            "화학물질 관리, EHS, MES, ERP 등 산업용 시스템 개발 경험",
        ],
        "required_skills": [],
        "job_responsibilities": ["CMS/CMS Pro 신규 기능 설계·개발", "MSDS 시스템 유지보수"],
    }
    enriched = enrich_tech_keywords(raw, build_source_blob(raw))
    lowered = [item.lower() for item in enriched]
    assert "sap" in lowered
    assert "erp" in lowered
    assert "ehs" in lowered
    assert "mes" in lowered
    assert "cms" in lowered
    assert "msds" in lowered


def test_is_quality_result_allows_unknown_company_when_rich_lists():
    result = {
        "company_name": "Unknown",
        "required_skills": ["Java"],
        "preferred_skills": ["React"],
        "tech_keywords": ["java"],
    }
    assert is_quality_result(result) is True
