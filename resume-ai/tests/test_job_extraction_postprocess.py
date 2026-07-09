from app.services.job_extraction_postprocess import (
    build_source_blob,
    clean_company_name,
    clean_tech_keywords,
    dedupe_redundant_required_skills,
    enrich_tech_keywords,
    filter_solution_keywords,
    has_ocr_garbage,
    is_duty_paraphrase_preferred,
    is_qualification_item,
    is_quality_result,
    is_solution_product_keyword,
    move_soft_skills_from_required,
    ocr_is_low_quality,
    postprocess_extraction,
    reclassify_talent_profile,
    remove_overlapping_items,
    remove_overlapping_preferred_skills,
    split_experience_from_skill_lines,
    split_tech_and_solution_keywords,
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
    assert is_qualification_item("관련 분야 경력 5년 이상") is True
    assert is_qualification_item("Java / Spring 개발 경력 5년 이상") is False
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


def test_clean_company_name_removes_logo_prefix():
    assert clean_company_name("SELF! 환경안전보건 전문기업") == "환경안전보건 전문기업"
    assert clean_company_name("PAGE 화학물질 전문기업") == "화학물질 전문기업"
    assert clean_company_name("삼성전자") == "삼성전자"


def test_remove_overlapping_preferred_and_responsibilities():
    responsibilities = [
        "CMS/CMS Pro 개발 및 고도화",
        "MSDS 시스템 유지보수 및 개선",
    ]
    preferred = [
        "CMS/CMS Pro 개발 및 고도화 경험",
        "React, TypeScript 기반 SPA 개발 경험",
    ]
    kept = remove_overlapping_items(responsibilities, preferred)
    assert len(kept) == 1
    assert "React" in kept[0]


def test_reclassify_talent_profile_moves_skill_and_soft_items():
    qualifications, required, core, talent = reclassify_talent_profile(
        [
            "화면 단위 설계부터 개발ㆍ배포까지 단독 수행 가능",
            "고객사ㆍ유관 부서와 원활하게 협업ㆍ커뮤니케이션",
            "성장",
        ],
        [],
        [],
        [],
    )
    assert any("설계" in item for item in required)
    assert any("협업" in item for item in core)
    assert talent == ["성장"]


def test_postprocess_generic_fintech_posting():
    raw = {
        "company_name": "HOME! KB금융그룹",
        "position": "백엔드 개발자",
        "qualifications": [],
        "required_skills": ["4년제 대학 졸업 이상", "Java/Spring 기반 서버 개발 3년 이상"],
        "preferred_skills": [
            "금융권 시스템 개발 경험",
            "금융권 시스템 개발 경험",
            "Kafka, Redis 활용 경험",
        ],
        "job_responsibilities": ["대출 심사 시스템 고도화", "대출 심사 시스템 고도화 및 운영"],
        "tech_keywords": ["Java", "Kafka", "Redis", "Kafka"],
        "talent_profile": ["책임감", "대규모 트래픽 서비스 설계 및 운영 경험"],
        "core_competencies": [],
        "job_description": "금융 IT 백엔드 채용",
    }
    result = postprocess_extraction(raw, "KB금융그룹 Java Spring Kafka Redis")
    assert result["company_name"] == "KB금융그룹"
    assert any("대학" in item for item in result["qualifications"])
    assert len(result["preferred_skills"]) == 2
    assert len(result["job_responsibilities"]) == 1
    assert "kafka" in [k.lower() for k in result["tech_keywords"]]
    assert any("책임감" in item for item in result["core_competencies"])


def test_postprocess_chemical_poster_like_payload():
    raw = {
        "company_name": "SELF! 환경안전보건 전문기업",
        "position": "디지털케어팀 웹 개발",
        "qualifications": ["4년제 대학 졸업 이상", "웹 개발 경력 5년 이상"],
        "required_skills": [
            "Java / Spring (Spring Boot 포함) 기반 웹 개발",
            "화면 단위 설계부터 개발ㆍ배포까지 단독 수행 가능",
        ],
        "preferred_skills": [
            "CMS/CMS Pro 개발 및 고도화 경험",
            "React, TypeScript 기반 SPA 개발 경험",
        ],
        "job_responsibilities": [
            "CMS/CMS Pro 개발 및 고도화",
            "MSDS 시스템 유지보수 및 개선",
        ],
        "tech_keywords": ["java", "cms", "CMS Pro", "erp", "sap"],
        "talent_profile": [
            "화면 단위 설계부터 개발ㆍ배포까지 단독 수행 가능",
            "고객사ㆍ유관 부서와 원활하게 협업ㆍ커뮤니케이션",
        ],
        "core_competencies": [],
        "job_description": "화학물질 관리 솔루션 개발 경력직",
    }
    result = postprocess_extraction(raw, "CMS MSDS ERP SAP React TypeScript")
    assert result["company_name"] == "환경안전보건 전문기업"
    assert len(result["preferred_skills"]) == 2
    assert any("CMS" in item for item in result["preferred_skills"])
    assert any("React" in item for item in result["preferred_skills"])
    assert any("설계" in item for item in result["required_skills"])
    assert any("협업" in item for item in result["core_competencies"])
    assert not any("협업" in item for item in result["required_skills"])
    assert "cms" in [k.lower() for k in result["tech_keywords"]]
    assert any("cms" in k.lower() for k in result["solution_keywords"])


def test_split_experience_from_mixed_skill_line():
    quals, required = split_experience_from_skill_lines(
        ["4년제 대학 졸업 이상", "Java / Spring 기반 웹 개발 경력 5년 이상"],
        [],
    )
    assert any("경력 5년" in item for item in quals)
    assert any("Java" in item for item in required)
    assert not any("경력" in item and "Java" in item for item in quals)


def test_move_soft_skills_from_required_dedupes_core():
    required, core = move_soft_skills_from_required(
        ["Java / Spring 개발", "고객사와 원활한 협업 능력"],
        ["원활한 협업 및 커뮤니케이션 능력"],
    )
    assert len(required) == 1
    assert "Java" in required[0]
    assert len(core) == 1
    assert "협업" in core[0]


def test_split_tech_and_solution_keywords():
    tech, solutions = split_tech_and_solution_keywords(
        ["java", "spring", "dr.cms", "dr.chemdb", "carbon-slim", "iot", "react"],
    )
    lowered_tech = [k.lower() for k in tech]
    lowered_solutions = [k.lower() for k in solutions]
    assert "java" in lowered_tech
    assert "iot" in lowered_tech
    assert "dr.cms" in lowered_solutions
    assert "carbon-slim" in lowered_solutions
    assert is_solution_product_keyword("dr.cms") is True
    assert is_solution_product_keyword("java") is False


def test_postprocess_fintech_extracts_experience_years():
    raw = {
        "company_name": "KB금융그룹",
        "position": "백엔드 개발자",
        "qualifications": ["4년제 대학 졸업 이상"],
        "required_skills": ["Java/Spring 기반 서버 개발 3년 이상"],
        "preferred_skills": ["Kafka, Redis 활용 경험"],
        "job_responsibilities": ["대출 심사 시스템 고도화"],
        "tech_keywords": ["java", "kafka", "redis"],
        "talent_profile": [],
        "core_competencies": [],
        "job_description": "금융 IT",
    }
    result = postprocess_extraction(raw, "Java Spring Kafka")
    assert any("경력 3년" in item for item in result["qualifications"])
    assert any("Java" in item for item in result["required_skills"])
    assert not any("3년" in item for item in result["required_skills"])


def test_normalize_section_overlap_for_chemical_poster():
    raw = {
        "company_name": "화학물질·환경안전보건 전문기업",
        "position": "IT 시스템 솔루션 개발자 (경력직)",
        "qualifications": [
            "4년제 대학 졸업 이상",
            "Java / Spring (Spring Boot 포함) 기반 웹 개발 경력 5년 이상",
            "MS-SQL 또는 동급 RDBMS 활용 경험 (Stored Procedure, 쿼리 튜닝 포함)",
            "HTML/CSS/JavaScript 기반 웹 프론트엔드 개발",
            "화면 단위 설계부터 개발·배포까지 단독 수행 가능자",
            "고객사·유관 부서와 원활하게 협업·커뮤니케이션 능력",
        ],
        "required_skills": [
            "Java / Spring (Spring Boot 포함) 기반 웹 개발",
            "MS-SQL 또는 동급 RDBMS 활용 (Stored Procedure, 쿼리 튜닝 포함)",
            "HTML/CSS/JavaScript 기반 웹 프론트엔드 개발",
            "화면 단위 설계, 개발, 배포 단독 수행",
        ],
        "preferred_skills": [
            "React, TypeScript 기반 SPA 개발 경험",
            "SI 프로젝트 PM 또는 파트리더 경험",
            "외주·협력 인력과의 협업 및 일정 관리 경험",
        ],
        "job_responsibilities": ["CMS / CMS Pro 개발 및 고도화"],
        "tech_keywords": ["java", "spring", "react"],
        "talent_profile": [],
        "core_competencies": [
            "원활한 협업 및 커뮤니케이션 능력",
            "SI 프로젝트 PM 또는 파트리더 경험",
            "외주·협력 인력과의 협업 및 일정 관리 경험",
            "개발 생산성 향상",
        ],
        "job_description": "화학물질 관리 솔루션 개발",
    }
    result = postprocess_extraction(raw, "Java Spring React")
    assert any("대학" in item for item in result["qualifications"])
    assert not any("Java" in item and "경력" in item for item in result["qualifications"])
    assert any("Java" in item for item in result["required_skills"])
    assert any("협업" in item for item in result["core_competencies"])
    assert not any("협업" in item for item in result["required_skills"])
    assert any("경력 5년" in item for item in result["qualifications"])
    assert not any("PM" in item for item in result["core_competencies"])
    assert not any("일정 관리" in item for item in result["core_competencies"])


def test_postprocess_user_reported_chemical_regression():
    raw = {
        "company_name": "환경안전보건 전문기업",
        "position": "디지털케어팀 웹 개발 (대리급 이상)",
        "qualifications": ["4년제 대학 졸업 이상", "경력 5년 이상"],
        "required_skills": [
            "Java / Spring (Spring Boot 포함) 기반 웹 개발",
            "MS-SQL 또는 동급 RDBMS 활용 경험 (Stored Procedure, 쿼리 튜닝 포함)",
            "HTML/CSS/JavaScript 기반 웹 프론트엔드 개발 경험",
            "화면 단위 설계부터 개발ㆍ배포까지 단독 수행 가능",
            "Spring Framework",
        ],
        "preferred_skills": [
            "AI(xframe) 관련 경험",
            "현대 프론트엔드 전환 경험 (화관법, 화평법, 산안법 기반)",
            "ERP/SAP 연동 경험",
            "인벤토리, LDAR-PRTR 등 환경규제 대응 기능 개발 경험",
            "React, TypeScript 기반 SPA 개발 경험",
            "CMS/CMS Pro 개발 및 고도화 경험",
        ],
        "job_responsibilities": [
            "CMS/CMS Pro 개발 및 고도화",
            "자사 화학물질관리시스템의 신규 기능 설계 개발 및 AI(xframe) 현대 프론트엔드 전환",
            "MSDS 시스템 유지보수 및 개선",
            "국내 주요 화학ㆍ소재 고객사 시스템의 추가 개발 및 ERP/SAP 연동, 인벤토리, LDAR-PRTR 등 환경규제 대응 기능 개발",
        ],
        "tech_keywords": [
            "java", "spring", "ms-sql", "rdbms", "html", "css", "javascript", "erp", "sap",
            "api", "cms", "msds", "ghs", "oapi", "CSCMS",
        ],
        "talent_profile": [],
        "core_competencies": ["고객사 및 유관 부서와 원활하게 협업 및 커뮤니케이션 가능한 자"],
        "job_description": "SELF! 환경안전보건 전문기업은 AI, IoT 등 ICT 기술을 융합하여 스마트 환경안전보건 서비스를 제공합니다.",
    }
    source = "React TypeScript Cursor Claude dr.cms carbon-slim CMS Pro xframe LDAR-PRTR IoT ICT"
    result = postprocess_extraction(raw, source)
    assert result["job_description"].startswith("환경안전보건")
    assert "Spring Framework" not in result["required_skills"]
    assert not any("프론트엔드 개발 경험" in item for item in result["required_skills"])
    assert any("React" in item for item in result["preferred_skills"])
    assert any("CMS" in item for item in result["preferred_skills"])
    assert not any("xframe" in item for item in result["preferred_skills"])
    assert not any("LDAR" in item for item in result["preferred_skills"])
    assert "CSCMS" not in result["solution_keywords"]
    assert any("dr.cms" in k.lower() for k in result["solution_keywords"])


def test_dedupe_redundant_required_skills_removes_spring_framework():
    deduped = dedupe_redundant_required_skills(
        ["Java / Spring (Spring Boot 포함) 기반 웹 개발", "Spring Framework"],
    )
    assert len(deduped) == 1
    assert "Spring Framework" not in deduped[0]


def test_filter_solution_keywords_removes_cscms_noise():
    assert filter_solution_keywords(["xframe", "CSCMS", "CMS Pro"]) == ["xframe", "CMS Pro"]


def test_is_duty_paraphrase_preferred_detects_responsibility_copy():
    responsibility = "국내 주요 화학ㆍ소재 고객사 시스템의 추가 개발 및 ERP/SAP 연동, 인벤토리, LDAR-PRTR 등 환경규제 대응 기능 개발"
    assert is_duty_paraphrase_preferred("ERP/SAP 연동 경험", responsibility) is True
    assert is_duty_paraphrase_preferred("React, TypeScript 기반 SPA 개발 경험", responsibility) is False


def test_is_quality_result_allows_unknown_company_when_rich_lists():
    result = {
        "company_name": "Unknown",
        "required_skills": ["Java"],
        "preferred_skills": ["React"],
        "tech_keywords": ["java"],
    }
    assert is_quality_result(result) is True
