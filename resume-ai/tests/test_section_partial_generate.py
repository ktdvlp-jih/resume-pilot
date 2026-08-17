"""문항별 부분 생성(_generate_by_sections) 단위 테스트."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from app.services.llm_service import LlmService


def _completion(text: str, model: str = "test-model") -> MagicMock:
    c = MagicMock()
    c.content = text
    c.model = model
    return c


@pytest.mark.asyncio
async def test_generate_by_sections_only_target_index(monkeypatch: pytest.MonkeyPatch) -> None:
    svc = LlmService()
    calls: list[str] = []

    async def fake_complete(op: str, system: str, user: str, temperature: float = 0.4) -> MagicMock:
        calls.append(user)
        # 제목 라인에서 문항 추출
        title = "지원동기"
        for line in user.splitlines():
            if line.startswith("제목:"):
                title = line.split(":", 1)[1].strip()
        return _completion(f"{title} 본문입니다. 구체적인 경험 설명을 포함합니다.")

    monkeypatch.setattr(svc, "complete_for_operation", fake_complete)
    monkeypatch.setattr(svc, "_style_violations", lambda _t: [])
    monkeypatch.setattr(svc, "_section_topic_violations", lambda _title, _t: [])
    monkeypatch.setattr(svc, "_clean_single_section", lambda text, _title: (text or "").strip())
    monkeypatch.setattr(
        svc,
        "_assign_section_experiences",
        lambda titles, experiences, job_analysis=None, target_chars=None: [[experiences[0]] for _ in titles],
    )

    experiences = [{"entity_id": "e1", "content": "프로젝트 A를 수행함"}]
    titles = ["지원동기", "성장과정", "직무역량"]
    existing = ["기존1", "기존2", "기존3"]

    def fill(selected: list[dict[str, Any]]) -> str:
        return "base prompt"

    content, model, sections = await svc._generate_by_sections(
        system_prompt="sys",
        fill_user_prompt=fill,
        experiences=experiences,
        titles=titles,
        section_index=1,
        existing_paragraphs=existing,
    )

    assert model == "test-model"
    assert len(calls) == 1
    assert "성장과정" in calls[0]
    assert sections[0]["status"] == "ok"
    assert sections[0]["content"] == "기존1"
    assert sections[1]["status"] == "ok"
    assert "성장과정" in sections[1]["content"]
    assert sections[2]["status"] == "ok"
    assert sections[2]["content"] == "기존3"
    assert "기존1" in content
    assert "기존3" in content


@pytest.mark.asyncio
async def test_generate_by_sections_records_error_without_abort(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    svc = LlmService()
    n = {"i": 0}

    async def fake_complete(op: str, system: str, user: str, temperature: float = 0.4) -> MagicMock:
        n["i"] += 1
        if n["i"] == 2:
            raise RuntimeError("quota exceeded")
        return _completion(f"성공 본문 {n['i']} 충분히 긴 내용입니다.")

    monkeypatch.setattr(svc, "complete_for_operation", fake_complete)
    monkeypatch.setattr(svc, "_style_violations", lambda _t: [])
    monkeypatch.setattr(svc, "_section_topic_violations", lambda _title, _t: [])
    monkeypatch.setattr(svc, "_clean_single_section", lambda text, _title: (text or "").strip())
    monkeypatch.setattr(
        svc,
        "_assign_section_experiences",
        lambda titles, experiences, job_analysis=None, target_chars=None: [[experiences[0]] for _ in titles],
    )

    content, _model, sections = await svc._generate_by_sections(
        system_prompt="sys",
        fill_user_prompt=lambda _s: "base",
        experiences=[{"entity_id": "e1", "content": "경험"}],
        titles=["A", "B", "C"],
    )

    assert sections[0]["status"] == "ok"
    assert sections[1]["status"] == "error"
    assert "quota" in (sections[1].get("error") or "")
    assert sections[2]["status"] == "ok"
    assert "성공 본문" in content


def test_length_plan_rules_short_target_one_scene() -> None:
    rules = LlmService._length_plan_rules(300)
    assert "장면은 1개" in rules
    assert "자르지" in rules


def test_length_plan_rules_career_is_not_one_scene() -> None:
    rules = LlmService._length_plan_rules(400, "career")
    assert "경력기술서" in rules
    assert "STAR" in rules
    assert "장면은 1개" not in rules


def test_accept_compressed_section_rejects_cut_off() -> None:
    original = "장애가 났을 때 캐시를 분리해 지연을 줄였습니다. " * 8
    cut = original[:90].rstrip()  # 문장 중간 절단
    assert LlmService._accept_compressed_section(original, cut, 200) is False


def test_accept_compressed_section_keeps_complete_shorter() -> None:
    original = "장애가 났을 때 캐시를 분리해 지연을 줄였습니다. " * 10
    compressed = (
        "장애 상황에서 조회 캐시를 분리해 병목을 없애고 응답을 안정화했습니다. "
        "배포 후 평균 응답 지연이 40% 감소했고, 피크 오류도 함께 줄었습니다. "
        "같은 판단으로 조회 경로를 단순하게 유지해 이후 장애 범위를 줄였습니다."
    )
    assert len(compressed) >= 110
    assert LlmService._accept_compressed_section(original, compressed, 200) is True


@pytest.mark.asyncio
async def test_generate_by_sections_compresses_without_clipping(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    svc = LlmService()
    calls: list[str] = []
    compressed = (
        "장애 상황에서 조회 캐시를 분리해 병목을 없애고 응답을 안정화했습니다. "
        "배포 후 평균 응답 지연이 40% 감소했고, 피크 오류도 함께 줄었습니다. "
        "같은 판단으로 조회 경로를 단순하게 유지해 이후 장애 범위를 줄였습니다."
    )

    async def fake_complete(op: str, system: str, user: str, temperature: float = 0.4) -> MagicMock:
        calls.append(user)
        if "완성된 글로" in user:
            return _completion(compressed)
        return _completion("가나다라마바사아자차카타파하. " * 40)

    monkeypatch.setattr(svc, "complete_for_operation", fake_complete)
    monkeypatch.setattr(svc, "_style_violations", lambda _t: [])
    monkeypatch.setattr(svc, "_section_topic_violations", lambda _title, _t: [])
    monkeypatch.setattr(svc, "_clean_single_section", lambda text, _title: (text or "").strip())
    monkeypatch.setattr(
        svc,
        "_assign_section_experiences",
        lambda titles, experiences, job_analysis=None, target_chars=None: [[experiences[0]] for _ in titles],
    )

    _content, _model, sections = await svc._generate_by_sections(
        system_prompt="sys",
        fill_user_prompt=lambda _s: "base",
        experiences=[{"entity_id": "e1", "content": "경험"}],
        titles=["지원동기"],
        section_target_chars=[200],
    )

    assert sections[0]["status"] == "ok"
    assert sections[0]["content"] == compressed
    assert "분량 계획" in calls[0]
    assert "장면은 1개" in calls[0]
    assert any("완성된 글로" in c for c in calls)
