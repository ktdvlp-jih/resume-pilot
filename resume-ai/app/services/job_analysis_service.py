import base64
import html
import io
import logging
import re
from typing import Any

import httpx

from app.config import settings
from app.clients.service_clients import prompt_client
from app.services.llm_service import llm_service

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

KEYWORD_NOISE = {
    "pretendard", "blinkmacsystemfont", "roboto", "helvetica", "neue", "segoe", "ui",
    "apple", "sd", "gothic", "pageview", "date", "id", "font", "sans", "serif",
    "monospace", "system", "variable", "webkit", "moz", "ms", "arial", "noto",
    "opensans", "nanum", "malgun", "dotum", "gulim", "batang", "dotumche",
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
    r"(?:필수|자격|요구)\s*(?:사항|조건|기술)[:\：]?\s*([\s\S]*?)(?=\n\s*(?:우대|선호|지원|근무|복리|채용|$))",
    r"(?:우대|선호)\s*(?:사항|조건|기술)[:\：]?\s*([\s\S]*?)(?=\n\s*(?:필수|지원|근무|복리|채용|$))",
]

JOB_EXTRACTION_SYSTEM = """You extract structured data from Korean or English job postings (text or screenshot).
Return ONLY valid JSON with these keys:
- company_name (string)
- position (string or null)
- required_skills (array of strings)
- preferred_skills (array of strings)
- tech_keywords (array of strings — frameworks, languages, tools)
- talent_profile (array of strings)
- core_competencies (array of strings)
- org_culture (string or null)
- job_description (string — 2-4 sentence summary)
Use Korean for Korean postings. Use empty arrays or null when unknown. Do not invent facts."""

VISION_USER_PROMPT = (
    "This image is a job posting screenshot (recruitment page, PDF export, or mobile capture). "
    "Extract company name, position, required/preferred skills, tech stack, and key responsibilities."
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
        text = content or ""
        st = source_type.upper()
        extraction_method = "text"

        if st == "URL" and source_url:
            text = await self._fetch_url(source_url) or text
            extraction_method = "url"
        elif st == "PDF" and file_base64:
            text = self._extract_pdf_base64(file_base64) or text
            extraction_method = "pdf"
        elif st == "IMAGE" and file_base64:
            text = self._extract_image_text(file_base64) or ""
            extraction_method = "ocr"
            if len(text.strip()) < 80:
                vision_result = await self._analyze_image_with_vision(file_base64, mime_type)
                if vision_result:
                    return vision_result

        text = self._normalize_text(text)

        if not text and st == "IMAGE" and file_base64:
            vision_result = await self._analyze_image_with_vision(file_base64, mime_type)
            if vision_result:
                return vision_result

        if not text:
            return {"error": "empty content", "company_name": "Unknown", "source_type": source_type}

        result = self._extract_from_text(text)
        if self._needs_llm_enrichment(result, text):
            llm_result = await self._extract_with_llm(text)
            if llm_result:
                result = self._merge_extraction(result, llm_result)
                extraction_method = f"{extraction_method}+llm"

        result["source_type"] = source_type
        result["extraction_method"] = extraction_method
        result["raw_content"] = text[:5000]
        return result

    def _extract_from_text(self, text: str) -> dict[str, Any]:
        company = self._extract_company(text)
        position = self._extract_position(text)
        required, preferred = self._extract_skills(text)
        tech_keywords = self._extract_tech_keywords(text)
        talent = self._extract_talent_profile(text)
        competencies = self._extract_competencies(text)
        culture = self._extract_culture(text)

        return {
            "company_name": company,
            "position": position,
            "title": f"{company} {position}".strip() if company or position else None,
            "required_skills": required,
            "preferred_skills": preferred,
            "tech_keywords": tech_keywords,
            "talent_profile": talent,
            "core_competencies": competencies,
            "core_values": talent[:3],
            "job_description": text[:2000],
            "org_culture": culture,
            "fit_score": None,
        }

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

    async def _analyze_image_with_vision(
        self,
        file_base64: str,
        mime_type: str | None,
    ) -> dict[str, Any] | None:
        if not settings.openai_api_key and not settings.internal_api_token:
            logger.info("Vision fallback skipped: no LLM configured")
            return None

        mime = mime_type if mime_type and mime_type.startswith("image/") else "image/png"
        data_url = f"data:{mime};base64,{file_base64}"
        parsed = await llm_service.complete_with_image_json_for_operation(
            "JOB_ANALYSIS",
            JOB_EXTRACTION_SYSTEM,
            VISION_USER_PROMPT,
            data_url,
        )
        if not parsed:
            return None

        result = self._fields_from_llm(parsed)
        result["source_type"] = "IMAGE"
        result["extraction_method"] = "vision"
        if not result.get("raw_content"):
            result["raw_content"] = result.get("job_description", "")[:5000]
        return result

    async def _extract_with_llm(self, text: str) -> dict[str, Any] | None:
        if not await llm_service.has_routes("JOB_ANALYSIS"):
            return None
        system = JOB_EXTRACTION_SYSTEM
        user_prompt = f"Extract job posting fields from this text:\n\n{text[:6000]}"
        try:
            prompt = await prompt_client.render("JOB_ANALYSIS", {"content": text[:6000]})
            system = prompt["system_prompt"]
            user_prompt = prompt["user_prompt"]
        except Exception as exc:
            logger.warning("JOB_ANALYSIS prompt render failed, using built-in: %s", exc)
        parsed = await llm_service.complete_json_for_operation("JOB_ANALYSIS", system, user_prompt)
        return self._fields_from_llm(parsed) if parsed else None

    def _fields_from_llm(self, parsed: dict[str, Any]) -> dict[str, Any]:
        company = str(parsed.get("company_name") or "Unknown").strip() or "Unknown"
        position = parsed.get("position")
        position_str = str(position).strip() if position else None

        required = self._coerce_string_list(parsed.get("required_skills"))
        preferred = self._coerce_string_list(parsed.get("preferred_skills"))
        tech = self._coerce_string_list(parsed.get("tech_keywords"))
        talent = self._coerce_string_list(parsed.get("talent_profile"))
        competencies = self._coerce_string_list(parsed.get("core_competencies"))
        culture = parsed.get("org_culture")
        description = str(parsed.get("job_description") or "").strip()

        return {
            "company_name": company,
            "position": position_str,
            "title": f"{company} {position_str}".strip() if company != "Unknown" or position_str else None,
            "required_skills": required[:15],
            "preferred_skills": preferred[:15],
            "tech_keywords": tech[:20],
            "talent_profile": talent[:10],
            "core_competencies": competencies[:10],
            "core_values": talent[:3],
            "job_description": description[:2000] if description else None,
            "org_culture": str(culture).strip() if culture else None,
            "fit_score": None,
            "raw_content": description[:5000] if description else None,
        }

    def _coerce_string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if item and str(item).strip()]

    def _needs_llm_enrichment(self, result: dict[str, Any], text: str) -> bool:
        if not (settings.openai_api_key or settings.internal_api_token):
            return False
        company = result.get("company_name")
        if company in (None, "", "Unknown"):
            return True
        if not result.get("tech_keywords") and not result.get("required_skills"):
            return True
        if any(marker in text for marker in ("필수", "우대", "기술스택", "Tech Stack")):
            if len(result.get("required_skills", [])) < 2:
                return True
        return False

    def _merge_extraction(self, base: dict[str, Any], llm: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key in ("company_name", "position", "org_culture", "job_description"):
            base_val = merged.get(key)
            llm_val = llm.get(key)
            if self._is_empty_field(base_val) and llm_val:
                merged[key] = llm_val

        for key in ("required_skills", "preferred_skills", "tech_keywords", "talent_profile", "core_competencies"):
            base_list = merged.get(key) or []
            llm_list = llm.get(key) or []
            if not base_list and llm_list:
                merged[key] = llm_list
            elif llm_list and len(base_list) < 2:
                merged[key] = list(dict.fromkeys(base_list + llm_list))[:15 if "skills" in key or "competencies" in key else 20]

        company = merged.get("company_name")
        position = merged.get("position")
        if company or position:
            merged["title"] = f"{company or ''} {position or ''}".strip()
        if llm.get("raw_content") and self._is_empty_field(merged.get("job_description")):
            merged["job_description"] = llm["raw_content"][:2000]
        merged["core_values"] = (merged.get("talent_profile") or [])[:3]
        return merged

    def _is_empty_field(self, value: Any) -> bool:
        if value is None:
            return True
        if isinstance(value, str):
            return not value.strip() or value.strip() == "Unknown"
        return False

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
        lines = [re.sub(r"\s+", " ", line).strip() for line in decoded.splitlines()]
        return "\n".join(line for line in lines if line).strip()

    def _is_noise_keyword(self, word: str) -> bool:
        lower = word.lower()
        if lower in KEYWORD_NOISE:
            return True
        if lower in {"engineer", "date", "pageview"} and word[0].isupper():
            return True
        return False

    def _extract_company(self, text: str) -> str:
        for pattern in COMPANY_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        first_line = text.split("\n")[0].strip()
        if len(first_line) <= 30:
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
            if match:
                items = self._split_bullet_items(match.group(1))
                if i == 0:
                    required = items
                else:
                    preferred = items
        if not required:
            if re.search(r"필수|우대|기술\s*스택", text, re.IGNORECASE):
                return [], preferred
            required = [w for w in self._extract_tech_keywords(text)[:5]]
        return required[:15], preferred[:15]

    def _split_bullet_items(self, section: str) -> list[str]:
        items = re.split(r"[\n•·\-\*]+", section)
        return [i.strip() for i in items if i.strip() and len(i.strip()) > 1][:15]

    def _extract_tech_keywords(self, text: str) -> list[str]:
        lower = text.lower()
        found = [kw for kw in TECH_KEYWORDS if kw in lower]
        extra = re.findall(r"\b([A-Z][a-zA-Z\+#\.]{1,20})\b", text)
        for e in extra:
            if e.lower() not in found and len(e) >= 2 and not self._is_noise_keyword(e):
                found.append(e)
        return list(dict.fromkeys(found))[:20]

    def _extract_talent_profile(self, text: str) -> list[str]:
        keywords = []
        patterns = [
            r"인재상[:\：]?\s*([^\n]+)",
            r"(책임감|주인의식|협업|커뮤니케이션|도전|창의|열정|성장|리더십|문제\s*해결)",
        ]
        for p in patterns:
            for m in re.finditer(p, text, re.IGNORECASE):
                val = m.group(1).strip() if m.lastindex else m.group(0).strip()
                if val and val not in keywords:
                    keywords.append(val[:50])
        return keywords[:10]

    def _extract_competencies(self, text: str) -> list[str]:
        section = re.search(r"(?:핵심\s*역량|주요\s*업무|담당\s*업무)[:\：]?\s*([\s\S]*?)(?=\n\s*\n|\Z)", text)
        if section:
            return self._split_bullet_items(section.group(1))[:10]
        return []

    def _extract_culture(self, text: str) -> str | None:
        match = re.search(r"(?:조직\s*문화|기업\s*문화|워크\s*환경)[:\：]?\s*([^\n]+)", text)
        return match.group(1).strip() if match else None


job_analysis_service = JobAnalysisService()
