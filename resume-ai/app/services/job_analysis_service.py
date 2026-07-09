import base64
import html
import io
import logging
import re
from typing import Any

import httpx

from app.config import settings
from app.clients.service_clients import prompt_client
from app.services.job_extraction_postprocess import (
    dedupe_list,
    has_ocr_garbage,
    is_quality_result,
    ocr_is_low_quality,
    postprocess_extraction,
)
from app.services.llm_service import RULE_BASED_MODEL, llm_service

logger = logging.getLogger(__name__)

TECH_KEYWORDS = {
    "java", "python", "javascript", "typescript", "react", "vue", "spring", "kotlin",
    "aws", "docker", "kubernetes", "postgresql", "mysql", "redis", "kafka",
    "node", "go", "golang", "flutter", "android", "ios", "swift",
    "ai", "ml", "tensorflow", "pytorch", "llm", "rag",
    "next.js", "nextjs", "nestjs", "express", "django", "fastapi", "graphql",
    "mongodb", "elasticsearch", "terraform", "jenkins", "gitlab", "github",
    "c++", "c#", ".net", "rust", "scala", "spark", "hadoop",
}

COMPANY_PATTERNS = [
    r"(?:\[?\s*)?([가-힣A-Za-z0-9]+(?:전자|그룹|증권|은행|카드|화재|생명|손해보험|모터스|자동차|건설|중공업|제약|바이오|소프트|테크|테크놀로지|커뮤니케이션|네트웍스|네트워크|엔터|엔터테인먼트|게임즈|스튜디오|랩|랩스|코퍼레이션|코리아|Korea|Inc\.?|Corp\.?))\s*(?:\]|\||채용|모집)",
    r"([가-힣A-Za-z0-9]+)\s*(?:에서|의)\s*(?:함께|일할|근무)",
]

POSITION_PATTERNS = [
    r"(?:직무|포지션|모집분야|채용분야)\s*[:\：]?\s*([^\n]+)",
    r"([가-힣A-Za-z/\s]+(?:개발자|엔지니어|디자이너|기획자|PM|매니저|분석가|연구원))\s*(?:모집|채용|구함)",
]

SKILL_SECTION_PATTERNS = [
    r"(?:필수|요구)\s*(?:사항|조건|기술)[:\：]?\s*([\s\S]*?)(?=\n\s*(?:우대|선호|지원|근무|복리|채용|전형|주요|담당|※|$))",
    r"(?:우대|선호)\s*(?:사항|조건|기술|요건)[:\：]?\s*([\s\S]*?)(?=\n\s*(?:필수|지원|근무|복리|채용|전형|주요|담당|※|$))",
    r"지원\s*자격[:\：]?\s*([\s\S]*?)(?=\n\s*(?:우대|선호|근무|복리|채용|전형|주요|담당|※|$))",
    r"자격\s*요건[:\：]?\s*([\s\S]*?)(?=\n\s*(?:우대|선호|근무|복리|채용|전형|주요|담당|※|$))",
]

RESPONSIBILITY_SECTION_PATTERNS = [
    r"(?:담당\s*업무|주요\s*업무)[:\：]?\s*([\s\S]*?)(?=\n\s*(?:자격|필수|우대|지원|근무|복리|채용|전형|※|$))",
]

JOB_EXTRACTION_SYSTEM = """You extract structured data from Korean or English job postings.
The input may be clean text, HTML text, PDF text, OCR output, or a recruitment poster image.

Return ONLY valid JSON with these keys:
- company_name (string — legal name OR the most specific organization label visible on the poster)
- position (string or null)
- qualifications (array — education, years-of-experience-only lines, licenses; NOT skill/experience bullets)
- required_skills (array — bullets from 지원 자격/자격요건/필수사항/필수 조건 sections)
- preferred_skills (array — REQUIRED. bullets from 우대사항/우대요건/우대 조건만; if that section exists, do NOT return [])
- tech_keywords (array — stack/product tokens only: languages, frameworks, DB, infra, dr.* names; lowercase; NOT full sentences)
- job_responsibilities (array — bullets from 주요업무/담당업무/업무내용 only)
- talent_profile (array — 인재상 keywords)
- core_competencies (array — soft skills only, NOT job duties)
- org_culture (string or null)
- job_description (string — 3-5 sentence summary; do NOT paste bullets from other fields)

Section mapping (use visible headers):
- 주요업무/담당업무 → job_responsibilities
- 지원 자격/자격요건/필수사항 → required_skills (education-only lines → qualifications)
- 우대사항/우대요건 → preferred_skills
- Stack grids / dr.* products → tech_keywords (tokens only)

Consistency and deduplication:
- Keep each source bullet in ONE primary field only.
- Do NOT repeat the same sentence across qualifications, required_skills, preferred_skills, or job_responsibilities.
- Do NOT copy 담당업무 into preferred_skills (even with "경험" appended).
- Do NOT put full skill bullets into tech_keywords; extract tokens (e.g. "java", "llm", "dr.cms").
- job_description summarizes; it must not duplicate bullet lists from other fields.
- Preserve original bullet wording when possible; avoid merging or paraphrasing.
- Fix obvious OCR typos (Spr1ng → Spring). Do NOT invent facts.
- Korean strings except tech_keywords."""

VISION_USER_PROMPT = (
    "This image is a Korean/English job posting poster or screenshot. "
    "Map each visible section header to exactly one JSON field: "
    "주요업무/담당업무 → job_responsibilities; "
    "지원 자격/자격요건/필수사항 → required_skills; "
    "우대사항/우대요건 → preferred_skills; "
    "dr.* product grid → tech_keywords (tokens only). "
    "Do NOT duplicate the same bullet across fields. "
    "job_description is a short summary only, not a bullet dump. "
    "Keep original bullet text where possible."
)


class JobAnalysisService:
    async def analyze(
        self,
        source_type: str,
        content: str,
        source_url: str | None = None,
        file_base64: str | None = None,
        mime_type: str | None = None,
    ) -> dict[str, Any]:
        st = source_type.upper()

        if st == "IMAGE" and file_base64:
            return await self._analyze_image(file_base64, mime_type, st)

        text = content or ""
        extraction_method = "text"

        if st == "URL" and source_url:
            text = await self._fetch_url(source_url) or text
            extraction_method = "url"
        elif st == "PDF" and file_base64:
            text = self._extract_pdf_base64(file_base64) or text
            extraction_method = "pdf"

        text = self._normalize_text(text)
        if not text:
            return {"error": "empty content", "company_name": "Unknown", "source_type": source_type}

        return await self._analyze_text(text, extraction_method, source_type)

    async def _analyze_image(
        self,
        file_base64: str,
        mime_type: str | None,
        source_type: str,
    ) -> dict[str, Any]:
        vision_result: dict[str, Any] | None = None
        vision_model: str | None = None

        if await self._can_use_llm():
            vision_raw, vision_model = await self._vision_extract(file_base64, mime_type)
            if vision_raw:
                vision_result = self._finalize_fields(
                    vision_raw,
                    source_text=vision_raw.get("job_description", ""),
                    extraction_method="vision",
                    source_type=source_type,
                    model=vision_model,
                )
                if is_quality_result(vision_result):
                    return vision_result

        ocr_text = self._extract_image_text(file_base64) or ""
        ocr_text = self._normalize_text(ocr_text)

        if ocr_text and await self._can_use_llm():
            should_try_text_llm = (
                not vision_result
                or not is_quality_result(vision_result)
                or ocr_is_low_quality(ocr_text)
            )
            if should_try_text_llm:
                llm_result = await self._analyze_text(
                    ocr_text,
                    "ocr+llm" if ocr_is_low_quality(ocr_text) else "ocr+llm",
                    source_type,
                )
                if is_quality_result(llm_result):
                    return llm_result

        if vision_result:
            return vision_result

        if ocr_text:
            rule_result = self._finalize_fields(
                self._extract_from_text(ocr_text),
                source_text=ocr_text,
                extraction_method="ocr+rule",
                source_type=source_type,
                model=RULE_BASED_MODEL,
            )
            rule_result["raw_content"] = ocr_text[:5000]
            return rule_result

        return {"error": "empty content", "company_name": "Unknown", "source_type": source_type}

    async def _analyze_text(
        self,
        text: str,
        extraction_method: str,
        source_type: str,
    ) -> dict[str, Any]:
        if await self._can_use_llm():
            try:
                llm_raw, model = await self._extract_with_llm(text)
                if llm_raw:
                    return self._finalize_fields(
                        llm_raw,
                        source_text=text,
                        extraction_method=f"{extraction_method}+llm",
                        source_type=source_type,
                        model=model,
                        raw_content=text[:5000],
                    )
                if model:
                    logger.warning(
                        "JOB_ANALYSIS LLM returned unparseable JSON (model=%s, source=%s)",
                        model,
                        source_type,
                    )
            except Exception as exc:
                logger.warning("JOB_ANALYSIS LLM failed, using rule fallback: %s", exc)
        else:
            logger.info(
                "JOB_ANALYSIS LLM unavailable: routes=%s credentials=%s",
                await llm_service.has_routes("JOB_ANALYSIS"),
                bool(settings.openai_api_key or settings.internal_api_token),
            )

        rule_result = self._finalize_fields(
            self._extract_from_text(text),
            source_text=text,
            extraction_method=f"{extraction_method}+rule",
            source_type=source_type,
            model=RULE_BASED_MODEL,
            raw_content=text[:5000],
        )
        return rule_result

    async def _can_use_llm(self) -> bool:
        return bool(settings.openai_api_key or settings.internal_api_token) and await llm_service.has_routes("JOB_ANALYSIS")

    async def _vision_extract(
        self,
        file_base64: str,
        mime_type: str | None,
    ) -> tuple[dict[str, Any] | None, str | None]:
        mime = mime_type if mime_type and mime_type.startswith("image/") else "image/png"
        data_url = f"data:{mime};base64,{file_base64}"
        parsed, model = await llm_service.complete_with_image_json_for_operation(
            "JOB_ANALYSIS",
            JOB_EXTRACTION_SYSTEM,
            VISION_USER_PROMPT,
            data_url,
        )
        if not parsed:
            return None, model
        return self._fields_from_llm(parsed), model

    async def _extract_with_llm(self, text: str) -> tuple[dict[str, Any] | None, str | None]:
        system = JOB_EXTRACTION_SYSTEM
        user_prompt = (
            "Analyze the following job posting text. "
            "If it contains OCR noise or broken words, correct them before extraction.\n\n"
            f"{text[:6000]}"
        )
        try:
            prompt = await prompt_client.render("JOB_ANALYSIS", {"content": text[:6000]})
            system = prompt["system_prompt"]
            user_prompt = prompt["user_prompt"]
        except Exception as exc:
            logger.warning("JOB_ANALYSIS prompt render failed, using built-in: %s", exc)

        parsed, model = await llm_service.complete_json_for_operation("JOB_ANALYSIS", system, user_prompt)
        if not parsed:
            return None, model
        return self._fields_from_llm(parsed), model

    def _finalize_fields(
        self,
        data: dict[str, Any],
        *,
        source_text: str,
        extraction_method: str,
        source_type: str,
        model: str | None = None,
        raw_content: str | None = None,
    ) -> dict[str, Any]:
        result = postprocess_extraction(data, raw_content or source_text)
        result["source_type"] = source_type
        result["extraction_method"] = extraction_method
        if model:
            result["model"] = model
        result["raw_content"] = raw_content or source_text[:5000]
        return result

    def _fields_from_llm(self, parsed: dict[str, Any]) -> dict[str, Any]:
        company = str(parsed.get("company_name") or "Unknown").strip() or "Unknown"
        position = parsed.get("position")
        position_str = str(position).strip() if position else None
        description = str(parsed.get("job_description") or "").strip()
        culture = parsed.get("org_culture")

        return {
            "company_name": company,
            "position": position_str,
            "title": f"{company} {position_str}".strip() if company != "Unknown" or position_str else None,
            "qualifications": self._coerce_string_list(parsed.get("qualifications")),
            "required_skills": self._coerce_string_list(parsed.get("required_skills")),
            "preferred_skills": self._coerce_string_list(parsed.get("preferred_skills")),
            "job_responsibilities": self._coerce_string_list(parsed.get("job_responsibilities")),
            "tech_keywords": self._coerce_string_list(parsed.get("tech_keywords")),
            "talent_profile": self._coerce_string_list(parsed.get("talent_profile")),
            "core_competencies": self._coerce_string_list(parsed.get("core_competencies")),
            "core_values": self._coerce_string_list(parsed.get("talent_profile"))[:3],
            "job_description": description[:2000] if description else None,
            "org_culture": str(culture).strip() if culture else None,
            "fit_score": None,
        }

    def _extract_from_text(self, text: str) -> dict[str, Any]:
        company = self._extract_company(text)
        position = self._extract_position(text)
        required, preferred = self._extract_skills(text)
        qualifications, required = self._split_qualifications(required)
        responsibilities = self._extract_responsibilities(text)
        tech_keywords = self._extract_tech_keywords(text)
        talent = self._extract_talent_profile(text)
        competencies = self._extract_competencies(text)
        culture = self._extract_culture(text)

        return {
            "company_name": company,
            "position": position,
            "title": f"{company} {position}".strip() if company or position else None,
            "qualifications": qualifications,
            "required_skills": required,
            "preferred_skills": preferred,
            "job_responsibilities": responsibilities,
            "tech_keywords": tech_keywords,
            "talent_profile": talent,
            "core_competencies": competencies,
            "core_values": talent[:3],
            "job_description": text[:2000],
            "org_culture": culture,
            "fit_score": None,
        }

    def _split_qualifications(self, items: list[str]) -> tuple[list[str], list[str]]:
        qualifications: list[str] = []
        skills: list[str] = []
        for item in items:
            if re.search(r"(4년제|대학|졸업|학사|석사|박사|전문학사)", item) and "경험" not in item:
                qualifications.append(item)
            else:
                skills.append(item)
        return dedupe_list(qualifications), dedupe_list(skills)

    def _extract_pdf_base64(self, file_base64: str) -> str | None:
        try:
            from pypdf import PdfReader
            data = base64.b64decode(file_base64)
            reader = PdfReader(io.BytesIO(data))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages).strip()
        except Exception as exc:
            logger.warning("PDF text extraction failed: %s", exc)
            return None

    def _extract_image_text(self, file_base64: str) -> str | None:
        try:
            from PIL import Image, ImageEnhance, ImageOps
            import pytesseract

            data = base64.b64decode(file_base64)
            image = Image.open(io.BytesIO(data))
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")

            width, height = image.size
            if max(width, height) < 1200:
                scale = 1200 / max(width, height)
                image = image.resize(
                    (int(width * scale), int(height * scale)),
                    Image.Resampling.LANCZOS,
                )

            image = ImageEnhance.Contrast(image).enhance(1.4)
            image = ImageEnhance.Sharpness(image).enhance(1.2)

            configs = ["--psm 3 --oem 3", "--psm 6 --oem 3", "--psm 11 --oem 3"]
            best = ""
            for config in configs:
                candidate = pytesseract.image_to_string(image, lang="kor+eng", config=config)
                if len(candidate.strip()) > len(best.strip()):
                    best = candidate

            return best.strip() if best.strip() else None
        except Exception as exc:
            logger.warning("OCR failed (tesseract may be missing): %s", exc)
            return None

    def _coerce_string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if item and str(item).strip()]

    async def _fetch_url(self, url: str) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers={"User-Agent": "ResumePilot/1.0"})
                if response.status_code == 200:
                    return self._html_to_text(response.text)
        except Exception as exc:
            logger.warning("URL fetch failed: %s", exc)
            return None
        return None

    def _html_to_text(self, html_content: str) -> str:
        text = html_content
        text = re.sub(r"<(script|style|noscript)[^>]*>[\s\S]*?</\1>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<(br|hr)\s*/?>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"</(p|div|li|h[1-6]|tr|td|th|section|article|header|footer)>", "\n", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        return self._normalize_text(text)

    def _normalize_text(self, text: str) -> str:
        decoded = text
        for _ in range(3):
            next_decoded = html.unescape(decoded)
            if next_decoded == decoded:
                break
            decoded = next_decoded
        decoded = decoded.replace("\u200b", "").replace("\ufeff", "")
        lines = [re.sub(r"\s+", " ", line).strip() for line in decoded.splitlines()]
        return "\n".join(line for line in lines if line).strip()

    def _extract_company(self, text: str) -> str:
        for pattern in COMPANY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if not has_ocr_garbage(candidate):
                    return candidate
        first_line = text.split("\n")[0].strip()
        if len(first_line) <= 30 and not has_ocr_garbage(first_line):
            return first_line
        return "Unknown"

    def _extract_position(self, text: str) -> str | None:
        for pattern in POSITION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:100]
        return None

    def _extract_skills(self, text: str) -> tuple[list[str], list[str]]:
        required: list[str] = []
        preferred: list[str] = []
        for i, pattern in enumerate(SKILL_SECTION_PATTERNS):
            match = re.search(pattern, text, re.IGNORECASE)
            if not match:
                continue
            items = self._split_bullet_items(match.group(1))
            if i in {0, 2, 3}:
                required.extend(items)
            elif i == 1:
                preferred.extend(items)
        return dedupe_list(required)[:15], dedupe_list(preferred)[:15]

    def _extract_responsibilities(self, text: str) -> list[str]:
        for pattern in RESPONSIBILITY_SECTION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return self._split_bullet_items(match.group(1))[:12]
        return []

    def _split_bullet_items(self, section: str) -> list[str]:
        section = section.replace("\u200b", "").replace("\ufeff", "")
        cleaned: list[str] = []
        for line in section.splitlines():
            normalized = re.sub(r"^[\s\-\*•·]+", "", line.strip())
            normalized = re.sub(r"\s+", " ", normalized)
            if normalized and len(normalized) > 1:
                cleaned.append(normalized)
        if cleaned:
            return cleaned[:15]
        items = re.split(r"[\n•·]+", section)
        return [i.strip() for i in items if i.strip() and len(i.strip()) > 1][:15]

    def _extract_tech_keywords(self, text: str) -> list[str]:
        lower = text.lower()
        found = [kw for kw in TECH_KEYWORDS if kw in lower]
        return dedupe_list(found)[:20]

    def _extract_talent_profile(self, text: str) -> list[str]:
        keywords = []
        patterns = [
            r"인재상[:\：]?\s*([^\n]+)",
            r"(책임감|주인의식|협업|커뮤니케이션|도전|창의|열정|성장|리더십|문제\s*해결)",
        ]
        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                val = match.group(1).strip() if match.lastindex else match.group(0).strip()
                if val and val not in keywords:
                    keywords.append(val[:50])
        return keywords[:10]

    def _extract_competencies(self, text: str) -> list[str]:
        section = re.search(r"(?:핵심\s*역량)[:\：]?\s*([\s\S]*?)(?=\n\s*\n|\Z)", text)
        if section:
            return self._split_bullet_items(section.group(1))[:10]
        return []

    def _extract_culture(self, text: str) -> str | None:
        match = re.search(r"(?:조직\s*문화|기업\s*문화|워크\s*환경)[:\：]?\s*([^\n]+)", text)
        return match.group(1).strip() if match else None

    def _merge_extraction(self, base: dict[str, Any], llm: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key in ("company_name", "position", "org_culture", "job_description"):
            base_val = merged.get(key)
            llm_val = llm.get(key)
            if self._is_empty_field(base_val) or (isinstance(base_val, str) and has_ocr_garbage(base_val)):
                if llm_val:
                    merged[key] = llm_val

        for key in (
            "qualifications",
            "required_skills",
            "preferred_skills",
            "job_responsibilities",
            "tech_keywords",
            "talent_profile",
            "core_competencies",
        ):
            base_list = merged.get(key) or []
            llm_list = llm.get(key) or []
            if not base_list and llm_list:
                merged[key] = llm_list
            elif llm_list and len(base_list) < 2:
                merged[key] = dedupe_list(base_list + llm_list)[:15]

        company = merged.get("company_name")
        position = merged.get("position")
        if company or position:
            merged["title"] = f"{company or ''} {position or ''}".strip()
        merged["core_values"] = (merged.get("talent_profile") or [])[:3]
        return merged

    def _is_empty_field(self, value: Any) -> bool:
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip() or value.strip() == "Unknown"
        return False


job_analysis_service = JobAnalysisService()
