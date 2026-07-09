import re
from typing import Any

TECH_KEYWORDS_CANONICAL = {
    "java", "python", "javascript", "typescript", "react", "vue", "spring", "kotlin",
    "aws", "docker", "kubernetes", "postgresql", "mysql", "redis", "kafka", "ms-sql",
    "mssql", "node", "go", "golang", "flutter", "android", "ios", "swift",
    "ai", "ml", "tensorflow", "pytorch", "llm", "rag",
    "next.js", "nextjs", "nestjs", "express", "django", "fastapi", "graphql",
    "mongodb", "elasticsearch", "terraform", "jenkins", "gitlab", "github",
    "c++", "c#", ".net", "rust", "scala", "spark", "hadoop",
    "spring boot", "cursor", "claude", "claude code",
    "sap", "erp", "ehs", "mes", "cms", "msds", "ghs", "html", "css",
    "oapi", "api", "spa", "rdbms",
}

KEYWORD_NOISE = {
    "pretendard", "blinkmacsystemfont", "roboto", "helvetica", "neue", "segoe", "ui",
    "apple", "sd", "gothic", "pageview", "date", "id", "font", "sans", "serif",
    "monospace", "system", "variable", "webkit", "moz", "ms", "arial", "noto",
    "opensans", "nanum", "malgun", "dotum", "gulim", "batang", "dotumche",
    "as", "al", "self", "soe", "bd", "boot", "ter", "pro", "engineer", "pageview",
    "autoupdate", "api_batch", "stored procedure", "storedprocedure",
}
SOLUTION_NOISE = {"cscms"}
PREFERRED_DISTINCT_MARKERS = (
    "react", "typescript", "cursor", "claude", "vue", "angular", "next.js", "nextjs",
    "pm", "파트리더", "리더", "자격증", "kafka", "kubernetes", "spa", "cms pro", "cms/cms",
)
DUTY_PARAPHRASE_MARKERS = (
    "xframe", "ldar", "prtr", "프론트엔드 전환", "연동 경험", "환경규제", "인벤토리",
)
PREFERRED_SECTION_PATTERN = re.compile(
    r"[※\s]*(?:우대\s*사항|우대\s*조건|우대\s*요건|우대)[:\：]?\s*"
    r"([\s\S]*?)(?=(?:\n\s*[※\s]*(?:담당|필수|자격|인재|지원|근무|복리|채용|주요|전형))|\Z)",
    re.IGNORECASE,
)
REQUIRED_SECTION_PATTERN = re.compile(
    r"[※\s]*(?:지원\s*자격|자격\s*요건|필수\s*(?:사항|조건|기술))[:\：]?\s*"
    r"([\s\S]*?)(?=(?:\n\s*[※\s]*(?:우대|주요|담당|근무|전형|복리|채용))|\Z)",
    re.IGNORECASE,
)
XFRAME_PRODUCT_PATTERN = re.compile(r"ai\s*\(\s*xframe\s*\)", re.IGNORECASE)
SOLUTION_EXTRACT_PATTERN = re.compile(
    r"\b(dr\.[a-z][a-z0-9]*|carbon[- ]?slim|chemwatch|fiveeyes|db\s*galleria|"
    r"cms\s*pro|xframe|ldar[- ]?prtr|carbon[- ]?slim|ai\s*\(\s*xframe\s*\))\b",
    re.IGNORECASE,
)

TECH_TOKEN_PATTERN = re.compile(
    r"\b("
    r"java|spring(?:\s+boot)?|react|typescript|javascript|python|fastapi|"
    r"sap|erp|ehs|mes|cms|msds|ghs|aws|docker|kubernetes|kafka|"
    r"postgresql|ms-?sql|html|css|graphql|redis|next\.?js|"
    r"cursor|claude(?:\s+code)?|spa|rdbms|oapi|autoupdate"
    r")\b",
    re.IGNORECASE,
)

QUALIFICATION_MARKERS = (
    "졸업", "학사", "석사", "박사", "대학", "학력",
    "자격증", "면허", "우대사항", "우대 사항", "필수 사항", "자격요건", "지원자격",
)
EXPERIENCE_YEARS_EXTRACT = re.compile(r"(?:경력\s*)?(\d+)\s*년\s*이상")
SOLUTION_PRODUCT_HINTS = (
    "chemdb", "carbon", "chemwatch", "fiveeyes", "galleria", "tbm",
    "psafety", "sofa", "scms", "ldar", "prtr", "cmspro", "carbonslim",
    "drcms", "drmsds", "drchemdb", "drhealth", "drsofa",
)
STACK_DOMAIN_KEYWORDS = {"iot", "ict", "java", "spring", "react", "typescript", "sap", "erp", "mes"}
EXPERIENCE_ONLY_PATTERN = re.compile(r"(경력|년\s*이상|년이상|년\s*↑)")
PREFERRED_EXPERIENCE_MARKERS = ("경험", "PM", "파트리더", "리더", "일정 관리", "자격증")

RESPONSIBILITY_MARKERS = (
    "담당", "업무", "설계", "개발", "유지보수", "운영", "고도화", "마이그레이션",
    "연동", "모듈", "기능",
)

GARBAGE_PATTERN = re.compile(r"[ㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ×■□◆◇]|(?:[ㄱ-ㅎ]\s*){3,}")
SHORT_CAPS_PATTERN = re.compile(r"\b[A-Z]{1,2}\b")
EDUCATION_PATTERN = re.compile(r"(4년제|대학|졸업|학사|석사|박사|전문학사)")
COMPANY_PREFIX_NOISE = re.compile(
    r"^(?:(?:[A-Z]{2,10}|[A-Z][a-z]{1,8})[!.\s·\-]*)+(?=[가-힣])",
    re.IGNORECASE,
)

SOFT_SKILL_MARKERS = (
    "협업", "커뮤니케이션", "리더십", "문제 해결", "책임감", "주인의식",
    "성장", "도전", "창의", "열정", "전문성", "소통",
)
TALENT_VALUE_MARKERS = ("성장", "도전", "혁신", "열정", "주인의식", "전문성", "창의", "인재상")
REQUIRED_SKILL_MARKERS = (
    "개발", "설계", "배포", "구현", "활용", "프론트엔드", "백엔드", "기반",
    "수행", "튜닝", "운영", "유지보수", "연동",
)
OVERLAP_THRESHOLD = 0.72


def has_ocr_garbage(text: str) -> bool:
    if not text:
        return False
    return bool(GARBAGE_PATTERN.search(text))


def ocr_is_low_quality(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 80:
        return True
    if has_ocr_garbage(stripped):
        return True
    short_caps = len(SHORT_CAPS_PATTERN.findall(stripped))
    if short_caps >= 8:
        return True
    return False


def is_quality_result(result: dict[str, Any]) -> bool:
    company = str(result.get("company_name") or "").strip()
    if company and company != "Unknown" and has_ocr_garbage(company):
        return False
    meaningful_lists = (
        "qualifications",
        "required_skills",
        "preferred_skills",
        "job_responsibilities",
        "tech_keywords",
    )
    filled = sum(1 for key in meaningful_lists if result.get(key))
    if filled >= 2:
        return True
    if filled == 1 and result.get("job_description"):
        return True
    return False


def build_source_blob(data: dict[str, Any], source_text: str = "") -> str:
    chunks = [source_text]
    for key in (
        "company_name",
        "position",
        "job_description",
        "org_culture",
        "qualifications",
        "required_skills",
        "preferred_skills",
        "job_responsibilities",
        "tech_keywords",
        "talent_profile",
        "core_competencies",
    ):
        value = data.get(key)
        if isinstance(value, list):
            chunks.extend(str(item) for item in value)
        elif value:
            chunks.append(str(value))
    return "\n".join(chunk for chunk in chunks if chunk)


def resolve_company_name(data: dict[str, Any], source_text: str = "") -> str:
    company = clean_company_name(str(data.get("company_name") or "").strip() or "Unknown")
    if company != "Unknown" and not has_ocr_garbage(company):
        return company

    blob = build_source_blob(data, source_text)
    patterns = [
        r"([가-힣][가-힣A-Za-z0-9·/&\-\s]{3,40}?(?:전문\s*기업|그룹|주식회사|\(주\)|㈜|Corp\.?|Inc\.?))",
        r"(\[[^\]]{2,40}\])",
    ]
    for pattern in patterns:
        match = re.search(pattern, blob)
        if match:
            candidate = clean_company_name(match.group(1).strip())
            if candidate and candidate != "Unknown" and not has_ocr_garbage(candidate):
                return candidate
    return company


def clean_company_name(name: str) -> str:
    cleaned = re.sub(r"\s+", " ", name.strip())
    if not cleaned or cleaned == "Unknown":
        return cleaned or "Unknown"

    cleaned = re.sub(r"^(?:SELF|PAGE|HOME|JOIN|CAREER)[!.\s·\-]*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^[!.\s·\-]+", "", cleaned)

    # Preserve Korean company abbreviations such as KB금융그룹, SK하이닉스, LG전자.
    if re.match(r"^[A-Z]{1,5}[가-힣]", cleaned):
        return cleaned.strip()

    cleaned = COMPANY_PREFIX_NOISE.sub("", cleaned)
    cleaned = re.sub(r"^[!.\s·\-]+", "", cleaned)
    korean_tail = re.search(r"([가-힣][가-힣\s·/&\-]{2,60}(?:전문\s*기업|그룹|주식회사|\(주\)|㈜)?)", cleaned)
    if korean_tail and cleaned != korean_tail.group(1):
        latin_prefix = cleaned[: korean_tail.start()].strip()
        if latin_prefix and re.fullmatch(r"[A-Za-z!.\s·\-]{2,20}", latin_prefix):
            cleaned = korean_tail.group(1).strip()

    return cleaned.strip() or "Unknown"


def enrich_tech_keywords(data: dict[str, Any], source_text: str = "") -> list[str]:
    blob = build_source_blob(data, source_text)
    collected: list[str] = []
    if isinstance(data.get("tech_keywords"), list):
        collected.extend(str(item) for item in data["tech_keywords"])
    for match in TECH_TOKEN_PATTERN.finditer(blob):
        collected.append(match.group(1))
    cleaned = clean_tech_keywords(collected, blob, limit=30)
    return collapse_tech_keyword_variants(cleaned)


def count_tech_tokens(text: str) -> int:
    return len(TECH_TOKEN_PATTERN.findall(text.lower()))


def is_technical_requirement(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if is_soft_competency_item(normalized) and count_tech_tokens(normalized) == 0:
        return False
    if count_tech_tokens(normalized) > 0:
        return True
    return any(marker in normalized for marker in REQUIRED_SKILL_MARKERS)


def is_core_qualification_only(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if EDUCATION_PATTERN.search(normalized):
        return True
    if "자격증" in normalized or "면허" in normalized:
        return True
    if EXPERIENCE_ONLY_PATTERN.search(normalized) and count_tech_tokens(normalized) == 0:
        return True
    if re.search(r"경력\s*\d", normalized) and count_tech_tokens(normalized) == 0:
        return True
    return False


def is_preferred_experience_item(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    return any(marker in normalized for marker in PREFERRED_EXPERIENCE_MARKERS) and len(normalized) > 12


def split_experience_from_skill_lines(
    qualifications: list[str],
    required_skills: list[str],
) -> tuple[list[str], list[str]]:
    quals: list[str] = []
    kept_required: list[str] = []
    exp_years_added: set[str] = set()

    def handle_line(item: str, default_bucket: str) -> None:
        match = EXPERIENCE_YEARS_EXTRACT.search(item)
        if match and count_tech_tokens(item) > 0:
            years = match.group(1)
            if years not in exp_years_added:
                quals.append(f"관련 분야 경력 {years}년 이상")
                exp_years_added.add(years)
            stripped = re.sub(r"[\s·ㆍ,/]*(?:경력\s*)?\d+\s*년\s*이상", "", item).strip()
            stripped = re.sub(r"\s+", " ", stripped).strip(" ,/·-")
            if stripped:
                kept_required.append(stripped)
        elif EXPERIENCE_YEARS_EXTRACT.search(item) and count_tech_tokens(item) == 0:
            quals.append(item)
        elif is_technical_requirement(item):
            kept_required.append(item)
        elif is_core_qualification_only(item):
            quals.append(item)
        elif default_bucket == "qual":
            quals.append(item)
        else:
            kept_required.append(item)

    for item in qualifications:
        handle_line(item, "qual")
    for item in required_skills:
        handle_line(item, "required")

    return dedupe_similar_items(quals), dedupe_similar_items(kept_required)


def move_soft_skills_from_required(
    required_skills: list[str],
    core_competencies: list[str],
) -> tuple[list[str], list[str]]:
    kept_required: list[str] = []
    kept_core = list(core_competencies)
    for item in required_skills:
        if is_soft_competency_item(item) and not is_technical_requirement(item):
            kept_core.append(item)
        else:
            kept_required.append(item)
    kept_core = dedupe_similar_items(kept_core)
    kept_required = remove_overlapping_items(kept_core, kept_required)
    return kept_required, kept_core


def is_solution_product_keyword(keyword: str) -> bool:
    lower = keyword.lower().strip()
    compact = lower.replace(" ", "").replace("-", "")
    if lower in TECH_KEYWORDS_CANONICAL:
        return False
    if lower in STACK_DOMAIN_KEYWORDS:
        return False
    if re.match(r"^dr\.[a-z]", lower) or re.match(r"^dr[a-z]", compact):
        return True
    if any(hint in compact for hint in SOLUTION_PRODUCT_HINTS):
        return True
    if re.match(r"^[a-z]+-[a-z]+$", lower) and count_tech_tokens(lower) == 0:
        return True
    if lower.startswith("cms pro") or compact == "cmspro":
        return True
    if lower in {"xframe", "ldar", "prtr", "ldar-prtr"}:
        return True
    if XFRAME_PRODUCT_PATTERN.search(lower) or compact.replace(" ", "") == "ai(xframe)":
        return True
    return False


def split_tech_and_solution_keywords(keywords: list[str]) -> tuple[list[str], list[str]]:
    tech: list[str] = []
    solutions: list[str] = []
    for raw in keywords:
        candidate = _normalize_keyword(str(raw))
        if not candidate or _is_noise_keyword(candidate):
            continue
        if is_solution_product_keyword(candidate):
            solutions.append(candidate)
        else:
            tech.append(candidate)
    return dedupe_list(tech), dedupe_list(solutions)


def normalize_section_overlap(
    qualifications: list[str],
    required_skills: list[str],
    preferred_skills: list[str],
    core_competencies: list[str],
) -> tuple[list[str], list[str], list[str]]:
    kept_qual: list[str] = []
    kept_required = list(required_skills)
    kept_core = list(core_competencies)

    for item in qualifications:
        if is_core_qualification_only(item):
            kept_qual.append(item)
        elif is_soft_competency_item(item) and not is_technical_requirement(item):
            kept_core.append(item)
        elif is_technical_requirement(item):
            kept_required.append(item)
        elif EXPERIENCE_ONLY_PATTERN.search(item) and count_tech_tokens(item) > 0:
            kept_required.append(item)
        else:
            kept_qual.append(item)

    kept_qual = remove_overlapping_items(kept_required, kept_qual)
    kept_qual = dedupe_similar_items(kept_qual)
    kept_required = dedupe_similar_items(kept_required)
    kept_required = remove_overlapping_items(kept_qual, kept_required)

    kept_core = [
        item for item in kept_core
        if not is_preferred_experience_item(item)
        and not any(items_similar(item, pref) for pref in preferred_skills)
    ]
    kept_core = dedupe_similar_items(kept_core)
    kept_core = remove_overlapping_items(preferred_skills, kept_core)

    return kept_qual[:12], kept_required[:15], kept_core[:10]


def is_qualification_item(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if is_core_qualification_only(normalized):
        return True
    if is_technical_requirement(normalized):
        return False
    if EDUCATION_PATTERN.search(normalized):
        return True
    return any(marker in normalized for marker in QUALIFICATION_MARKERS)


def is_required_skill_like(text: str) -> bool:
    normalized = text.strip()
    if not normalized or is_qualification_item(normalized):
        return False
    if len(normalized) < 8:
        return False
    return any(marker in normalized for marker in REQUIRED_SKILL_MARKERS)


def is_soft_competency_item(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    return any(marker in normalized for marker in SOFT_SKILL_MARKERS)


def is_true_talent_value(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if len(normalized) > 24:
        return False
    return any(marker in normalized for marker in TALENT_VALUE_MARKERS)


def _token_set(text: str) -> set[str]:
    return set(re.findall(r"[가-힣]{2,}|[a-zA-Z]{2,}", text.lower()))


def items_similar(left: str, right: str, threshold: float = OVERLAP_THRESHOLD) -> bool:
    left_norm = re.sub(r"[\s·ㆍ:,.!\-/?()]+", "", left.lower())
    right_norm = re.sub(r"[\s·ㆍ:,.!\-/?()]+", "", right.lower())
    if not left_norm or not right_norm:
        return False
    if left_norm in right_norm or right_norm in left_norm:
        return True
    left_tokens = _token_set(left)
    right_tokens = _token_set(right)
    if not left_tokens or not right_tokens:
        return False
    overlap = len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))
    return overlap >= threshold


def remove_overlapping_items(reference: list[str], candidates: list[str]) -> list[str]:
    kept: list[str] = []
    for candidate in candidates:
        if any(items_similar(candidate, ref) for ref in reference):
            continue
        kept.append(candidate)
    return kept


def is_preferred_experience_variant(preferred: str, reference: str) -> bool:
    if not items_similar(preferred, reference):
        return False
    return "경험" in preferred or is_preferred_experience_item(preferred)


def is_distinct_preferred_item(preferred: str) -> bool:
    lower = preferred.lower()
    return any(marker in lower for marker in PREFERRED_DISTINCT_MARKERS)


def is_duty_paraphrase_preferred(preferred: str, responsibility: str) -> bool:
    if is_distinct_preferred_item(preferred):
        return False
    lower = preferred.lower()
    resp_lower = responsibility.lower()
    if any(marker in lower and marker in resp_lower for marker in DUTY_PARAPHRASE_MARKERS):
        return True
    if not items_similar(preferred, responsibility, threshold=0.55):
        return False
    if any(marker in lower for marker in DUTY_PARAPHRASE_MARKERS):
        return True
    stripped = re.sub(r"\s*경험\s*$", "", preferred).strip()
    if items_similar(stripped, responsibility, threshold=0.78):
        return True
    return "경험" in preferred and items_similar(preferred, responsibility, threshold=0.72)


def is_near_duplicate_line(left: str, right: str) -> bool:
    left_norm = re.sub(r"[\s·ㆍ:,.!\-/?()]+", "", left.lower())
    right_norm = re.sub(r"[\s·ㆍ:,.!\-/?()]+", "", right.lower())
    if not left_norm or not right_norm:
        return False
    return left_norm in right_norm or right_norm in left_norm


def remove_overlapping_preferred_skills(
    job_responsibilities: list[str],
    required_skills: list[str],
    preferred_skills: list[str],
) -> list[str]:
    kept: list[str] = []
    for preferred in preferred_skills:
        if any(is_near_duplicate_line(preferred, required) for required in required_skills):
            continue
        if any(is_duty_paraphrase_preferred(preferred, responsibility) for responsibility in job_responsibilities):
            continue
        kept.append(preferred)
    return dedupe_similar_items(kept)


def clean_required_skill_phrasing(required_skills: list[str]) -> list[str]:
    cleaned: list[str] = []
    for item in required_skills:
        normalized = re.sub(r"\s*경험\s*$", "", item.strip()).strip()
        cleaned.append(normalized or item)
    return cleaned


def dedupe_redundant_required_skills(required_skills: list[str]) -> list[str]:
    kept = list(required_skills)
    has_spring_detail = any(
        re.search(r"spring", item, re.IGNORECASE) and not re.fullmatch(r"spring\s*framework", item.strip(), re.IGNORECASE)
        for item in kept
    )
    if has_spring_detail:
        kept = [
            item for item in kept
            if not re.fullmatch(r"spring\s*framework", item.strip(), re.IGNORECASE)
        ]
    return dedupe_similar_items(kept)


def is_solution_noise(keyword: str) -> bool:
    compact = keyword.lower().replace(" ", "").replace("-", "")
    return compact in SOLUTION_NOISE


def filter_solution_keywords(keywords: list[str]) -> list[str]:
    return dedupe_list([keyword for keyword in keywords if keyword and not is_solution_noise(keyword)])


def dedupe_tech_keywords_against_skill_bullets(
    tech_keywords: list[str],
    required_skills: list[str],
    preferred_skills: list[str],
) -> list[str]:
    """Remove tech_keywords that duplicate full skill bullets (tokens should stay short)."""
    skill_lines = required_skills + preferred_skills
    kept: list[str] = []
    for keyword in tech_keywords:
        token = str(keyword).strip()
        if len(token) <= 24:
            kept.append(keyword)
            continue
        if any(items_similar(token, line, threshold=0.82) for line in skill_lines):
            continue
        kept.append(keyword)
    return kept


def trim_description_if_bullet_dump(description: str, bullets: list[str]) -> str:
    if not description:
        return description
    long_bullets = [b for b in bullets if len(b) > 12]
    if not long_bullets:
        return description
    sentences = re.split(r"(?<=[.!?。])\s+", description.strip())
    echo_sentences = [
        s for s in sentences
        if any(b in s or items_similar(b, s, threshold=0.88) for b in long_bullets)
    ]
    if len(echo_sentences) >= 2:
        summary = [
            s for s in sentences
            if s not in echo_sentences
        ]
        if summary:
            return " ".join(summary[:3]).strip()
        return sentences[0].strip() if sentences else description
    return description


def _parse_section_bullets(section: str) -> list[str]:
    section = section.replace("\u200b", "").replace("\ufeff", "")
    cleaned: list[str] = []
    for line in section.splitlines():
        normalized = re.sub(r"^[\s\-\*•·]+", "", line.strip())
        normalized = re.sub(r"\s+", " ", normalized)
        if normalized and len(normalized) > 1:
            cleaned.append(normalized)
    if cleaned:
        return cleaned
    items = re.split(r"[\n•·]+", section)
    return [i.strip() for i in items if i.strip() and len(i.strip()) > 1]


def recover_preferred_skills_from_source(source_text: str, preferred_skills: list[str]) -> list[str]:
    if preferred_skills:
        return preferred_skills
    for blob in (source_text,):
        match = PREFERRED_SECTION_PATTERN.search(blob or "")
        if not match:
            continue
        recovered: list[str] = []
        for line in _parse_section_bullets(match.group(1)):
            if len(line) >= 6:
                recovered.append(line)
        if recovered:
            return dedupe_list(recovered)[:15]
    return preferred_skills


def recover_required_skills_from_source(
    source_text: str,
    qualifications: list[str],
    required_skills: list[str],
) -> tuple[list[str], list[str]]:
    if required_skills:
        return qualifications, required_skills
    match = REQUIRED_SECTION_PATTERN.search(source_text or "")
    if not match:
        return qualifications, required_skills
    recovered = _parse_section_bullets(match.group(1))
    if not recovered:
        return qualifications, required_skills
    kept_qual = [
        item for item in qualifications
        if not any(items_similar(item, req) for req in recovered)
    ]
    return dedupe_list(kept_qual), dedupe_similar_items(recovered)[:15]


def promote_requirements_from_qualifications(
    qualifications: list[str],
    required_skills: list[str],
) -> tuple[list[str], list[str]]:
    if required_skills:
        return qualifications, required_skills
    kept_qual: list[str] = []
    promoted: list[str] = []
    for item in qualifications:
        if is_core_qualification_only(item) and not is_required_skill_like(item):
            kept_qual.append(item)
        elif len(item.strip()) >= 12:
            promoted.append(item)
        else:
            kept_qual.append(item)
    return dedupe_list(kept_qual), dedupe_similar_items(promoted)[:15]


def normalize_experience_qualifications(qualifications: list[str]) -> list[str]:
    normalized: list[str] = []
    for item in qualifications:
        match = EXPERIENCE_YEARS_EXTRACT.search(item)
        if match and count_tech_tokens(item) == 0:
            years = match.group(1)
            normalized.append(f"관련 분야 경력 {years}년 이상")
        else:
            normalized.append(item)
    return dedupe_similar_items(normalized)


def clean_job_description(description: str) -> str:
    cleaned = re.sub(r"\s+", " ", description.strip())
    if not cleaned:
        return cleaned
    cleaned = re.sub(
        r"^(?:SELF|PAGE|HOME|JOIN|CAREER)[!.\s·\-]*",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    return cleaned.strip()


def extract_solution_keywords(source_text: str, keywords: list[str]) -> list[str]:
    found: list[str] = []
    blob = source_text or ""
    for match in SOLUTION_EXTRACT_PATTERN.finditer(blob):
        found.append(match.group(1).strip())
    for keyword in keywords:
        if is_solution_product_keyword(keyword):
            found.append(keyword)
    return filter_solution_keywords(found)


def is_valid_tech_keyword(keyword: str) -> bool:
    lower = keyword.lower().strip()
    if not lower or _is_noise_keyword(keyword):
        return False
    if lower in TECH_KEYWORDS_CANONICAL:
        return True
    if lower in STACK_DOMAIN_KEYWORDS:
        return True
    if count_tech_tokens(keyword) > 0:
        return True
    if XFRAME_PRODUCT_PATTERN.search(lower):
        return False
    if re.fullmatch(r"[A-Z0-9_]+", keyword) and lower not in TECH_KEYWORDS_CANONICAL:
        return False
    if " " in keyword and lower not in TECH_KEYWORDS_CANONICAL:
        return False
    return len(lower) >= 3 and lower.isascii()


def dedupe_similar_items(items: list[str]) -> list[str]:
    kept: list[str] = []
    for item in items:
        if any(items_similar(item, existing) for existing in kept):
            continue
        kept.append(item)
    return kept


def reclassify_talent_profile(
    talent_profile: list[str],
    qualifications: list[str],
    required_skills: list[str],
    core_competencies: list[str],
) -> tuple[list[str], list[str], list[str], list[str]]:
    kept_talent: list[str] = []
    for item in talent_profile:
        if is_qualification_item(item):
            qualifications.append(item)
        elif is_required_skill_like(item):
            required_skills.append(item)
        elif is_true_talent_value(item):
            kept_talent.append(item)
        elif is_soft_competency_item(item):
            core_competencies.append(item)
        elif len(item) > 20:
            required_skills.append(item)
        else:
            kept_talent.append(item)
    return (
        dedupe_list(qualifications),
        dedupe_list(required_skills),
        dedupe_list(core_competencies),
        dedupe_list(kept_talent),
    )


def collapse_tech_keyword_variants(keywords: list[str]) -> list[str]:
    kept: list[str] = []
    seen: set[str] = set()
    for keyword in dedupe_list(keywords):
        lower = keyword.lower().strip()
        base = lower.split()[0] if lower.split() and lower.split()[0] in TECH_KEYWORDS_CANONICAL else lower
        if base in seen:
            continue
        seen.add(base)
        kept.append(base if base in TECH_KEYWORDS_CANONICAL else keyword)
    return kept


def is_responsibility_item(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if normalized in {"우대사항", "필수사항", "자격요건", "담당업무", "핵심 역량"}:
        return False
    return any(marker in normalized for marker in RESPONSIBILITY_MARKERS)


def _normalize_keyword(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value.strip())
    lower = cleaned.lower()
    if lower in TECH_KEYWORDS_CANONICAL:
        return lower
    return cleaned


def _is_noise_keyword(word: str) -> bool:
    lower = word.lower().strip()
    if not lower or len(lower) <= 1:
        return True
    if lower in KEYWORD_NOISE:
        return True
    if lower.isalpha() and len(lower) <= 2:
        return True
    if has_ocr_garbage(word):
        return True
    return False


def clean_tech_keywords(keywords: list[str], source_text: str = "", *, limit: int = 20) -> list[str]:
    source_lower = source_text.lower()
    cleaned: list[str] = []
    for raw in keywords:
        candidate = _normalize_keyword(str(raw))
        if not candidate:
            continue
        lower = candidate.lower()
        if lower in TECH_KEYWORDS_CANONICAL:
            cleaned.append(lower)
            continue
        if not is_valid_tech_keyword(candidate):
            continue
        if len(candidate) >= 3 and (lower in source_lower or candidate in source_text):
            cleaned.append(candidate)
    return dedupe_list(cleaned)[:limit]


def dedupe_list(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        normalized = re.sub(r"\s+", " ", str(item).strip())
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def clean_string_list(items: Any, *, max_items: int = 15) -> list[str]:
    if not isinstance(items, list):
        return []
    cleaned = [re.sub(r"\s+", " ", str(item).strip()) for item in items if str(item).strip()]
    return dedupe_list(cleaned)[:max_items]


def postprocess_extraction(data: dict[str, Any], source_text: str = "") -> dict[str, Any]:
    result = dict(data)

    qualifications = clean_string_list(result.get("qualifications"), max_items=12)
    required_skills = clean_string_list(result.get("required_skills"), max_items=15)
    preferred_skills = clean_string_list(result.get("preferred_skills"), max_items=15)
    job_responsibilities = clean_string_list(result.get("job_responsibilities"), max_items=15)
    job_responsibilities = dedupe_similar_items(job_responsibilities)
    core_competencies = clean_string_list(result.get("core_competencies"), max_items=10)
    talent_profile = clean_string_list(result.get("talent_profile"), max_items=10)

    moved_to_qualifications: list[str] = []
    kept_required: list[str] = []
    for item in required_skills:
        if is_qualification_item(item):
            moved_to_qualifications.append(item)
        else:
            kept_required.append(item)

    moved_from_core: list[str] = []
    kept_core: list[str] = []
    for item in core_competencies:
        if is_responsibility_item(item) and len(item) > 12:
            moved_from_core.append(item)
        else:
            kept_core.append(item)

    if not job_responsibilities and moved_from_core:
        job_responsibilities = moved_from_core
        kept_core = [item for item in kept_core if item not in moved_from_core]

    qualifications = dedupe_list(qualifications + moved_to_qualifications)
    qualifications, kept_required, kept_core, talent_profile = reclassify_talent_profile(
        talent_profile,
        qualifications,
        kept_required,
        kept_core,
    )
    qualifications, kept_required = split_experience_from_skill_lines(qualifications, kept_required)
    qualifications = normalize_experience_qualifications(qualifications)
    source_blob_early = build_source_blob(result, source_text)
    qualifications, kept_required = recover_required_skills_from_source(
        source_text or source_blob_early,
        qualifications,
        kept_required,
    )
    preferred_skills = recover_preferred_skills_from_source(
        source_text or source_blob_early,
        preferred_skills,
    )
    preferred_skills = remove_overlapping_preferred_skills(
        job_responsibilities,
        kept_required,
        preferred_skills,
    )
    qualifications, kept_required, kept_core = normalize_section_overlap(
        qualifications,
        kept_required,
        preferred_skills,
        kept_core,
    )
    qualifications, kept_required = promote_requirements_from_qualifications(qualifications, kept_required)
    kept_required, kept_core = move_soft_skills_from_required(kept_required, kept_core)
    kept_required = clean_required_skill_phrasing(kept_required)
    kept_required = dedupe_redundant_required_skills(kept_required)

    source_blob = build_source_blob(
        {
            **result,
            "qualifications": qualifications,
            "required_skills": kept_required,
            "preferred_skills": preferred_skills,
            "job_responsibilities": job_responsibilities,
            "talent_profile": talent_profile,
            "core_competencies": kept_core,
        },
        source_text,
    )
    tech_keywords = enrich_tech_keywords(result, source_blob)
    raw_keywords = [str(item) for item in (result.get("tech_keywords") or []) if str(item).strip()]
    merged_keywords = dedupe_list(tech_keywords + raw_keywords)
    merged_keywords = [
        kw for kw in merged_keywords
        if not XFRAME_PRODUCT_PATTERN.search(str(kw))
    ]
    tech_keywords, solution_keywords = split_tech_and_solution_keywords(merged_keywords)
    solution_keywords = filter_solution_keywords(
        dedupe_list(solution_keywords + extract_solution_keywords(source_blob, merged_keywords)),
    )[:15]
    tech_keywords = collapse_tech_keyword_variants(
        [kw for kw in tech_keywords if is_valid_tech_keyword(kw)],
    )[:20]
    tech_keywords = dedupe_tech_keywords_against_skill_bullets(
        tech_keywords,
        kept_required,
        preferred_skills,
    )
    company_name = resolve_company_name(result, source_blob)

    position = result.get("position")
    position_str = str(position).strip() if position else None
    if position_str and has_ocr_garbage(position_str):
        position_str = None

    description = clean_job_description(str(result.get("job_description") or ""))
    description = trim_description_if_bullet_dump(
        description,
        job_responsibilities + kept_required + preferred_skills,
    )
    culture = result.get("org_culture")
    culture_str = str(culture).strip() if culture else None

    return {
        **result,
        "company_name": company_name,
        "position": position_str,
        "title": f"{company_name} {position_str}".strip() if company_name != "Unknown" or position_str else result.get("title"),
        "qualifications": qualifications,
        "required_skills": kept_required,
        "preferred_skills": preferred_skills,
        "job_responsibilities": job_responsibilities,
        "tech_keywords": tech_keywords,
        "solution_keywords": solution_keywords,
        "talent_profile": talent_profile,
        "core_competencies": kept_core,
        "job_description": description[:2000] if description else None,
        "org_culture": culture_str,
        "core_values": talent_profile[:3],
    }
