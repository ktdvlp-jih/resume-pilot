import re
from collections import Counter
from typing import Any

FORMAL_MARKERS = ["습니다", "습니다", "입니다", "됩니다", "하겠습니다", "드립니다"]
INFORMAL_MARKERS = ["해요", "이에요", "거예요", "할게요", "했어요"]
CONNECTORS = ["그리고", "또한", "따라서", "그러나", "하지만", "또", "및", "그래서", "이를 통해", "이에", "덕분에", "기반으로"]


class WritingStyleService:
    def analyze(self, content: str) -> dict[str, Any]:
        text = content.strip()
        if not text:
            return {"error": "empty content"}

        sentences = [s.strip() for s in re.split(r"[.!?]\s*|\n+", text) if s.strip()]
        words = re.findall(r"[가-힣a-zA-Z]{2,}", text)
        word_freq = Counter(w.lower() for w in words if len(w) >= 2)
        frequent = [w for w, _ in word_freq.most_common(10)]

        avg_len = sum(len(s) for s in sentences) / max(len(sentences), 1)
        formal_count = sum(text.count(m) for m in FORMAL_MARKERS)
        informal_count = sum(text.count(m) for m in INFORMAL_MARKERS)
        uses_formal = formal_count >= informal_count

        found_connectors = [c for c in CONNECTORS if c in text]
        tone = self._detect_tone(text, uses_formal)
        sentence_style = "간결형" if avg_len < 40 else "서술형" if avg_len < 80 else "장문형"

        return {
            "frequent_words": frequent,
            "avg_sentence_length": round(avg_len, 1),
            "uses_formal_speech": uses_formal,
            "sentence_style": sentence_style,
            "expression_style": self._describe_style(uses_formal, avg_len, found_connectors),
            "connectors": found_connectors[:8],
            "tone": tone,
            "sentence_count": len(sentences),
            "word_count": len(words),
        }

    def _detect_tone(self, text: str, formal: bool) -> str:
        if any(w in text for w in ["성과", "달성", "개선", "향상", "%"]):
            base = "성과 중심"
        elif any(w in text for w in ["협업", "팀", "함께", "소통"]):
            base = "협업 중심"
        elif any(w in text for w in ["도전", "성장", "배움", "학습"]):
            base = "성장 중심"
        else:
            base = "경험 서술형"
        return f"{base} / {'존댓말' if formal else '반말 혼용'}"

    def _describe_style(self, formal: bool, avg_len: float, connectors: list[str]) -> str:
        parts = []
        parts.append("존댓말 기반" if formal else "구어체 혼용")
        parts.append(f"평균 문장 {avg_len:.0f}자")
        if connectors:
            parts.append(f"연결어: {', '.join(connectors[:3])}")
        return ". ".join(parts)


writing_style_service = WritingStyleService()
