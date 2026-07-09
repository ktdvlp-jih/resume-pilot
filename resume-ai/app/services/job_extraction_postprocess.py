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
}

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
    "졸업", "학사", "석사", "박사", "대학", "학력", "경력", "년 이상", "년이상",
    "자격", "면허", "우대사항", "우대 사항", "필수 사항", "자격요건", "지원자격",
)

RESPONSIBILITY_MARKERS = (
    "담당", "업무", "설계", "개발", "유지보수", "운영", "고도화", "마이그레이션",
    "연동", "모듈", "기능",
)

GARBAGE_PATTERN = re.compile(r"[ㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ×■□◆◇]|(?:[ㄱ-ㅎ]\s*){3,}")
SHORT_CAPS_PATTERN = re.compile(r"\b[A-Z]{1,2}\b")
EDUCATION_PATTERN = re.compile(r"(4년제|대학|졸업|학사|석사|박사|전문학사)")


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
    company = str(data.get("company_name") or "").strip() or "Unknown"
    if company != "Unknown" and not has_ocr_garbage(company):
        return company

    blob = build_source_blob(data, source_text)
    patterns = [
        r"([가-힣A-Za-z0-9·/&\-\s]{4,40}?(?:전문\s*기업|그룹|주식회사|\(주\)|㈜|Corp\.?|Inc\.?))",
        r"(\[[^\]]{2,40}\])",
    ]
    for pattern in patterns:
        match = re.search(pattern, blob)
        if match:
            candidate = match.group(1).strip()
            if candidate and not has_ocr_garbage(candidate):
                return candidate
    return company


def enrich_tech_keywords(data: dict[str, Any], source_text: str = "") -> list[str]:
    blob = build_source_blob(data, source_text)
    collected: list[str] = []
    if isinstance(data.get("tech_keywords"), list):
        collected.extend(str(item) for item in data["tech_keywords"])
    for match in TECH_TOKEN_PATTERN.finditer(blob):
        collected.append(match.group(1))
    return clean_tech_keywords(collected, blob, limit=30)


def is_qualification_item(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False
    if EDUCATION_PATTERN.search(normalized):
        return True
    return any(marker in normalized for marker in QUALIFICATION_MARKERS)


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
        if not candidate or _is_noise_keyword(candidate):
            continue
        lower = candidate.lower()
        if lower in TECH_KEYWORDS_CANONICAL:
            cleaned.append(lower)
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
    source_blob = build_source_blob(result, source_text)
    tech_keywords = enrich_tech_keywords(result, source_blob)
    company_name = resolve_company_name(result, source_blob)

    position = result.get("position")
    position_str = str(position).strip() if position else None
    if position_str and has_ocr_garbage(position_str):
        position_str = None

    description = str(result.get("job_description") or "").strip()
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
        "talent_profile": talent_profile,
        "core_competencies": kept_core,
        "job_description": description[:2000] if description else None,
        "org_culture": culture_str,
        "core_values": talent_profile[:3],
    }
