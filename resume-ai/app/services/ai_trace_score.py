"""AI 흔적·자연스러움 점수.

LLM 문장 판정(GREEN/YELLOW/RED)을 어절 가중으로 합치고,
연속 의심 문장·반복·문장 리듬을 더한다. 자연스러움은 흔적의 단순 역수가 아니다.
"""

from __future__ import annotations

import math
import re
from typing import Any

from app.services.llm_service import LlmService

_LEVEL_WEIGHT = {
    "GREEN": 0.0,
    "YELLOW": 0.45,
    "RED": 1.0,
}
_GREEN_HEURISTIC_WEIGHT = 0.25
_MIN_CHARS = 8
_CLUSTER_FLAG = 0.45
_CONNECTOR_START = re.compile(
    r"^(또한|더불어|이를 통해|이러한|특히|따라서|뿐만 아니라)\s*"
)


def eoeol_count(text: str) -> int:
    """띄어쓰기 단위(어절)."""
    return max(1, len((text or "").split()))


def score_detections(
    detections: list[dict[str, Any]],
    content: str = "",
) -> dict[str, float]:
    rows = [d for d in detections if isinstance(d, dict)]
    if not rows:
        return {
            "ai_trace_percent": 0.0,
            "naturalness": 100.0,
        }

    prepared: list[tuple[str, float, int]] = []
    for item in rows:
        sentence = str(item.get("sentence") or "").strip()
        if len(sentence) < _MIN_CHARS:
            continue
        level = str(item.get("level") or "").strip().upper()
        severity = _LEVEL_WEIGHT.get(level)
        if severity is None:
            continue
        if severity == 0.0 and LlmService._style_violations(sentence):
            severity = _GREEN_HEURISTIC_WEIGHT
        prepared.append((sentence, severity, eoeol_count(sentence)))

    if not prepared:
        return {
            "ai_trace_percent": 0.0,
            "naturalness": 100.0,
        }

    severities = _apply_paragraph_context([s for _, s, _ in prepared], [t for t, _, _ in prepared])
    weighted_trace = 0.0
    weight_sum = 0.0
    sentences: list[str] = []
    for (sentence, _, weight), severity in zip(prepared, severities):
        weighted_trace += weight * min(1.0, severity)
        weight_sum += weight
        sentences.append(sentence)

    ai_trace = round(min(100.0, 100.0 * weighted_trace / weight_sum), 1)
    rhythm_penalty = _rhythm_penalty(sentences or _split_sentences(content))
    naturalness = round(max(0.0, min(100.0, 100.0 - ai_trace - rhythm_penalty)), 1)
    return {
        "ai_trace_percent": ai_trace,
        "naturalness": naturalness,
    }


def _apply_paragraph_context(severities: list[float], sentences: list[str]) -> list[float]:
    """연속된 의심 문장·접속 시작은 문단 맥락으로 가중한다."""
    out = list(severities)
    run = 0
    for i, sev in enumerate(severities):
        if sev >= _CLUSTER_FLAG:
            run += 1
            if run >= 3:
                out[i] = min(1.0, sev * 1.35)
            elif run >= 2:
                out[i] = min(1.0, sev * 1.2)
        else:
            run = 0
        if i > 0 and _CONNECTOR_START.match(sentences[i]) and _CONNECTOR_START.match(sentences[i - 1]):
            out[i] = min(1.0, max(out[i], 0.35))
            out[i - 1] = min(1.0, max(out[i - 1], 0.35))
    return out


def _split_sentences(content: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?다요])\s+", content or "") if len(s.strip()) >= _MIN_CHARS]


def _rhythm_penalty(sentences: list[str]) -> float:
    """문장 길이가 거의 같으면 AI 리듬으로 보고 자연스러움을 조금 깎는다."""
    lengths = [len(s) for s in sentences if len(s) >= _MIN_CHARS]
    if len(lengths) < 4:
        return 0.0
    mean = sum(lengths) / len(lengths)
    if mean <= 0:
        return 0.0
    variance = sum((n - mean) ** 2 for n in lengths) / len(lengths)
    cv = math.sqrt(variance) / mean
    if cv < 0.12:
        return 5.0
    if cv < 0.20:
        return 2.0
    return 0.0
