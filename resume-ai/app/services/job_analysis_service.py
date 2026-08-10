import asyncio
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
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

JOB_EXTRACTION_SYSTEM = """You extract structured data from Korean or English job postings.
The input may be clean text, HTML text, PDF text, OCR output, or a recruitment poster image.

Return ONLY valid JSON with these keys:
- company_name (string — legal name OR the most specific organization label visible on the poster)
- position (string or null — overall posting title; if multiple 모집부문, use the posting title or join titles with " / ")
- recruitment_sections (array — ONE object per 모집부문/직무 row when the posting has multiple roles; [] if single-role or no table)
  each object: {
    title (string — e.g. 토목시공 기술자, 안전관리),
    job_responsibilities (array),
    required_skills (array),
    preferred_skills (array),
    qualifications (array),
    headcount (string or null — 인원 if present)
  }
- qualifications (array — education, years-of-experience-only lines, licenses; NOT skill/experience bullets)
- required_skills (array — bullets from 지원 자격/자격요건/필수사항/필수 조건 sections)
- preferred_skills (array — bullets from 우대사항/우대요건/우대 조건; section absent → [])
- tech_keywords (array — stack/product tokens only: languages, frameworks, DB, infra, dr.* names; lowercase; NOT full sentences)
- job_responsibilities (array — bullets from 주요업무/담당업무/업무내용 only; section absent → [])
- work_conditions (array — 근무조건/고용형태/급여/근무지/근무시간 if present; else [])
- benefits (array — 복지/복리후생/혜택 if present; else [])
- hiring_process (array — 채용절차/전형절차 if present; else [])
- notes (array — 유의사항 if present; else [])
- talent_profile (array — 인재상 keywords)
- core_competencies (array — soft skills only, NOT job duties)
- org_culture (array — 조직문화 bullets only; NOT welfare/benefits; [] if none)
- job_description (string — 3-5 sentence summary; do NOT paste bullets from other fields)

Section mapping (common on Saramin/company postings, but not required on every JD;
use visible headers only; missing → []):
- 모집부문 table with 2+ roles → recruitment_sections (do NOT merge roles into one flat blob)
- 주요업무/담당업무 → job_responsibilities (or per-section when multi-role)
- 지원 자격/자격요건/필수사항 → required_skills (education-only lines → qualifications)
- 우대사항/우대요건 → preferred_skills
- 근무조건/근무형태/급여/근무지/근무시간 → work_conditions
- 복지/복리후생/혜택 → benefits (never put these in org_culture)
- 채용절차/전형절차 → hiring_process
- 유의사항 → notes
- 조직문화 → org_culture (array)
- Stack grids / dr.* products → tech_keywords (tokens only)

Consistency and deduplication:
- Keep each source bullet in ONE primary field only.
- When multiple 모집부문 exist, put role-specific duties/requirements into that recruitment_sections entry; shared welfare/process stay in top-level benefits/hiring_process.
- Do NOT invent or force-fill sections that are not in the posting.
- Do NOT repeat the same sentence across list fields.
- Do NOT copy 담당업무 into preferred_skills.
- Do NOT put welfare items into org_culture.
- org_culture, work_conditions, benefits, hiring_process, notes, recruitment_sections MUST be JSON arrays (never a single string or a stringified list).
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
            # 사람인 추적 파라미터(searchword 등)가 붙은 URL 문자열을 LLM에 넣으면
            # 검색어 기업명으로 공고를 날조할 수 있으므로, 본문 fetch 성공만 허용한다.
            canonical = self._canonicalize_job_url(source_url) or source_url
            fetched = await self._fetch_url(canonical)
            if not fetched:
                return {
                    "error": "url fetch failed",
                    "company_name": "Unknown",
                    "source_type": source_type,
                    "source_url": canonical,
                }
            text = fetched
            extraction_method = "url"
        elif st == "PDF" and file_base64:
            text = await asyncio.to_thread(self._extract_pdf_base64, file_base64) or text
            extraction_method = "pdf"

        text = self._normalize_text(text)
        if not text:
            return {"error": "empty content", "company_name": "Unknown", "source_type": source_type}
        if st == "URL" and self._looks_like_url_only(text):
            return {
                "error": "url fetch failed",
                "company_name": "Unknown",
                "source_type": source_type,
            }

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

        # 여기 도달 = Vision 부재 또는 품질 미달. OCR 경로는 보조 수단으로만 사용하고,
        # Vision 결과가 있으면 빈 필드를 채우는 병합만 한다 (전체 덮어쓰기 금지).
        ocr_text = await asyncio.to_thread(self._extract_image_text, file_base64) or ""
        ocr_text = self._normalize_text(ocr_text)

        if ocr_text and await self._can_use_llm():
            llm_result = await self._analyze_text(ocr_text, "ocr", source_type)
            if vision_result:
                llm_result = self._merge_vision_into(llm_result, vision_result)
            if is_quality_result(llm_result):
                return llm_result

        if vision_result:
            return vision_result

        if ocr_text:
            raise RuntimeError("JOB_ANALYSIS LLM unavailable after OCR")

        return {"error": "empty content", "company_name": "Unknown", "source_type": source_type}

    async def _analyze_text(
        self,
        text: str,
        extraction_method: str,
        source_type: str,
    ) -> dict[str, Any]:
        if not await self._can_use_llm():
            raise RuntimeError(
                "JOB_ANALYSIS LLM unavailable: "
                f"routes={await llm_service.has_routes('JOB_ANALYSIS')} "
                f"credentials={bool(settings.openai_api_key or settings.internal_api_token)}"
            )
        try:
            llm_raw, model = await self._extract_with_llm(text)
        except Exception as exc:
            logger.exception("JOB_ANALYSIS LLM failed: %s", exc)
            raise
        if llm_raw:
            return self._finalize_fields(
                llm_raw,
                source_text=text,
                extraction_method=f"{extraction_method}+llm",
                source_type=source_type,
                model=model,
                raw_content=text[:5000],
            )
        raise RuntimeError(
            f"JOB_ANALYSIS LLM returned unparseable JSON (model={model}, source={source_type})"
        )

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

    _MERGE_LIST_FIELDS = (
        "qualifications", "required_skills", "preferred_skills",
        "job_responsibilities", "tech_keywords", "solution_keywords",
        "core_competencies", "talent_profile", "core_values",
        "org_culture", "work_conditions", "benefits", "hiring_process", "notes",
    )
    _MERGE_SCALAR_FIELDS = ("position", "job_description", "title")

    def _merge_vision_into(self, base: dict[str, Any], vision: dict[str, Any]) -> dict[str, Any]:
        """OCR+LLM 결과(base)의 빈 필드만 Vision 결과로 보완한다. 채워진 필드는 유지."""
        merged = dict(base)
        for key in self._MERGE_LIST_FIELDS:
            if not merged.get(key) and vision.get(key):
                merged[key] = vision[key]
        for key in self._MERGE_SCALAR_FIELDS:
            if not merged.get(key) and vision.get(key):
                merged[key] = vision[key]
        base_company = str(merged.get("company_name") or "").strip()
        vision_company = str(vision.get("company_name") or "").strip()
        if (not base_company or base_company == "Unknown") and vision_company and vision_company != "Unknown":
            merged["company_name"] = vision_company
        merged["extraction_method"] = f"{base.get('extraction_method', 'ocr+llm')}+vision-merge"
        return merged

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
            "work_conditions": self._coerce_string_list(parsed.get("work_conditions")),
            "benefits": self._coerce_string_list(parsed.get("benefits")),
            "hiring_process": self._coerce_string_list(parsed.get("hiring_process")),
            "notes": self._coerce_string_list(parsed.get("notes")),
            "job_description": description[:2000] if description else None,
            "org_culture": self._coerce_string_list(parsed.get("org_culture")),
            "recruitment_sections": parsed.get("recruitment_sections") or parsed.get("job_sections") or [],
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

    def _coerce_string_list(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            items = value
        elif isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            if text.startswith("[") and text.endswith("]"):
                import ast
                import json

                parsed: Any = None
                try:
                    parsed = json.loads(text)
                except Exception:
                    try:
                        parsed = ast.literal_eval(text)
                    except Exception:
                        parsed = None
                if isinstance(parsed, list):
                    items = parsed
                else:
                    items = [line.strip(" -•·▪︎") for line in text.splitlines() if line.strip()]
            else:
                items = [line.strip(" -•·▪︎") for line in text.splitlines() if line.strip()]
                if len(items) == 1 and ("', '" in text or '", "' in text):
                    # fallback: comma-separated quoted items without brackets
                    items = [p.strip(" '\"") for p in re.split(r"'\s*,\s*'|\"\s*,\s*\"", text.strip("[]'\" "))]
        else:
            return []
        return [str(item).strip() for item in items if item and str(item).strip()]

    async def _fetch_url(self, url: str) -> str | None:
        try:
            detail_urls = self._job_board_detail_urls(url)
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": url,
            }
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                detail_parts: list[str] = []
                page_parts: list[str] = []
                for target in detail_urls:
                    text = await self._fetch_html_text(client, target, headers)
                    if text:
                        detail_parts.append(text)
                page_text = await self._fetch_html_text(client, url, headers)
                if page_text:
                    page_parts.append(page_text)

            rich_details = [t for t in detail_parts if self._looks_like_job_detail(t)]
            if rich_details:
                # 상세 본문 우선. 페이지 요약이 있으면 앞에 짧게 붙이지 않고 상세만 사용.
                return max(rich_details, key=len)

            candidates = [t for t in (*detail_parts, *page_parts) if t]
            if not candidates:
                return None
            return max(candidates, key=self._job_detail_score)
        except Exception as exc:
            logger.warning("URL fetch failed: %s", exc)
            return None

    async def _fetch_html_text(self, client: httpx.AsyncClient, url: str, headers: dict[str, str]) -> str | None:
        try:
            response = await client.get(url, headers=headers)
        except Exception as exc:
            logger.warning("URL fetch failed (%s): %s", url, exc)
            return None
        if response.status_code != 200 or not response.text:
            return None
        text = self._html_to_text(response.text)
        return text if text and len(text) >= 80 else None

    @staticmethod
    def _looks_like_job_detail(text: str) -> bool:
        markers = (
            "주요업무", "담당업무", "자격요건", "우대사항", "우대조건",
            "지원자격", "모집부문", "필수", "우대",
        )
        hits = sum(1 for m in markers if m in text)
        return hits >= 2 and len(text) >= 300

    @staticmethod
    def _job_detail_score(text: str) -> int:
        markers = (
            "주요업무", "담당업무", "자격요건", "우대사항", "우대조건",
            "지원자격", "모집부문", "근무조건", "복리후생",
        )
        score = sum(100 for m in markers if m in text)
        # 네비게이션 위주 HTML 감점
        nav_noise = sum(1 for m in ("로그인", "회원가입", "전체메뉴", "기업서비스") if m in text)
        score -= nav_noise * 40
        score += min(len(text), 4000) // 20
        return score

    @staticmethod
    def _canonicalize_job_url(url: str) -> str | None:
        """추적 파라미터(searchword 등)를 제거한 공고 식별 URL만 남긴다."""
        if not url:
            return None
        m = re.search(r"saramin\.co\.kr/.*[?&]rec_idx=(\d+)", url, re.IGNORECASE)
        if not m:
            m = re.search(r"saramin\.co\.kr/.*/(\d{6,})", url, re.IGNORECASE)
        if m:
            return f"https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={m.group(1)}"

        m = re.search(r"jobkorea\.co\.kr/Recruit/GI_Read/(\d+)", url, re.IGNORECASE)
        if m:
            return f"https://www.jobkorea.co.kr/Recruit/GI_Read/{m.group(1)}"
        return None

    @staticmethod
    def _looks_like_url_only(text: str) -> bool:
        t = (text or "").strip()
        if not t or len(t) > 2000:
            return False
        if re.fullmatch(r"https?://\S+", t):
            return True
        return "://" in t and ("searchword=" in t or "rec_idx=" in t) and len(t) < 800

    @staticmethod
    def _job_board_detail_urls(url: str) -> list[str]:
        """사람인/잡코리아 목록 페이지는 요약만 주고, 상세 본문 전용 URL을 추가한다."""
        detail: list[str] = []
        canonical = JobAnalysisService._canonicalize_job_url(url) or url

        m = re.search(r"saramin\.co\.kr/.*[?&]rec_idx=(\d+)", canonical, re.IGNORECASE)
        if not m:
            m = re.search(r"saramin\.co\.kr/.*/(\d{6,})", canonical, re.IGNORECASE)
        if m:
            rid = m.group(1)
            detail.append(
                f"https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx={rid}"
            )

        m = re.search(r"jobkorea\.co\.kr/Recruit/GI_Read/(\d+)", canonical, re.IGNORECASE)
        if m:
            gno = m.group(1)
            detail.append(
                "https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm"
                f"?Gno={gno}&isHiringCenter=false&hideMapView=false"
            )

        return detail

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

    def _merge_extraction(self, base: dict[str, Any], llm: dict[str, Any]) -> dict[str, Any]:
        merged = dict(base)
        for key in ("company_name", "position", "job_description"):
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
            "org_culture",
            "work_conditions",
            "benefits",
            "hiring_process",
            "notes",
        ):
            base_list = merged.get(key) or []
            llm_list = llm.get(key) or []
            if not isinstance(base_list, list):
                base_list = self._coerce_string_list(base_list)
            if not isinstance(llm_list, list):
                llm_list = self._coerce_string_list(llm_list)
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
