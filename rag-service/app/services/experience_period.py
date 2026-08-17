"""경험 기간을 RAG·프롬프트용 한 줄로 만든다. 임베딩 유사도에는 쓰지 않는다."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


def _as_date_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return None
    return text[:10]


def format_experience_period(start: Any, end: Any) -> str | None:
    start_s = _as_date_str(start)
    end_s = _as_date_str(end)
    if not start_s and not end_s:
        return None
    start_label = start_s or "?"
    if end_s:
        return f"기간: {start_label} ~ {end_s} (종료 · 과거 경험. 현재 담당처럼 쓰지 말 것)"
    return f"기간: {start_label} ~ 진행중 (현재 담당. 이 경험만 현재형 가능)"
