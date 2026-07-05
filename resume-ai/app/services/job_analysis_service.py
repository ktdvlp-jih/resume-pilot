import base64
import io
import re
from collections import Counter
from typing import Any

import httpx

TECH_KEYWORDS = {
    "java", "python", "javascript", "typescript", "react", "vue", "spring", "kotlin",
    "aws", "docker", "kubernetes", "postgresql", "mysql", "redis", "kafka",
    "node", "go", "golang", "flutter", "android", "ios", "swift",
    "ai", "ml", "tensorflow", "pytorch", "llm", "rag",
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

        if st == "URL" and source_url:
            text = await self._fetch_url(source_url) or text
        elif st == "PDF" and file_base64:
            text = self._extract_pdf_base64(file_base64) or text
        elif st == "IMAGE" and file_base64:
            text = self._extract_image_text(file_base64) or text

        text = text.strip()
        if not text:
            return {"error": "empty content", "company_name": "Unknown"}

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
            "source_type": source_type,
            "raw_content": text[:5000],
        }

    def _extract_pdf_base64(self, file_base64: str) -> str | None:
        try:
            from pypdf import PdfReader
            data = base64.b64decode(file_base64)
            reader = PdfReader(io.BytesIO(data))
            pages = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(pages).strip()
        except Exception:
            return None

    def _extract_image_text(self, file_base64: str) -> str | None:
        try:
            from PIL import Image
            import pytesseract
            data = base64.b64decode(file_base64)
            image = Image.open(io.BytesIO(data))
            return pytesseract.image_to_string(image, lang="kor+eng").strip()
        except Exception:
            return None

    async def _fetch_url(self, url: str) -> str | None:
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers={"User-Agent": "ResumePilot/1.0"})
                if response.status_code == 200:
                    html = response.text
                    return re.sub(r"<[^>]+>", " ", html)
        except Exception:
            return None
        return None

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
            if e.lower() not in found and len(e) >= 2:
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
