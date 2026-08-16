"""SECTION_ANALYSIS JSON 정규화."""

from app.services.generation_service import SectionAnalysisService


def test_normalize_fills_missing_and_clamps():
    titles = ["지원동기", "팀 내 갈등", "입사 후 포부"]
    parsed = {
        "sections": [
            {
                "index": 0,
                "intent": "motivation",
                "needs_unique_story": True,
                "max_experiences": 1,
                "look_for": ["ACHIEVEMENT"],
                "asks": "왜 이 회사인지",
            },
            {
                "index": 1,
                "intent": "conflict",
                "look_for": ["CONFLICT_RESOLUTION", "bogus"],
                "max_experiences": 9,
            },
            {
                "index": 2,
                "intent": "aspiration",
                "needs_unique_story": True,
                "max_experiences": 2,
            },
        ]
    }
    out = SectionAnalysisService.normalize(titles, parsed)
    assert len(out) == 3
    assert out[0]["intent"] == "motivation"
    assert out[1]["look_for"] == ["CONFLICT_RESOLUTION"]
    assert out[1]["max_experiences"] == 2
    assert out[2]["needs_unique_story"] is False
    assert out[2]["max_experiences"] == 1
    assert out[2]["title"] == "입사 후 포부"
