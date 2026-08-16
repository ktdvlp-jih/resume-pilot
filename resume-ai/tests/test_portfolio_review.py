"""PORTFOLIO_REVIEW JSON 정규화 단위 테스트."""

from app.services.generation_service import PortfolioReviewService


def test_normalize_four_fields():
    parsed = {
        "relevant_experiences": [
            {"id": "e1", "title": "프로젝트 A", "why_fits": "직무 경험"},
        ],
        "unused_experiences": [
            {"id": "e2", "title": "프로젝트 B", "reason": "초고에 없음"},
        ],
        "unsupported_claims": [
            {"claim": "매출 300% 증가", "reason": "경험에 수치 없음"},
        ],
        "revision_directions": ["프로젝트 B의 성과 수치를 한 줄 보강하세요."],
    }
    result = PortfolioReviewService._normalize(parsed)
    assert result is not None
    assert len(result["relevant_experiences"]) == 1
    assert result["relevant_experiences"][0]["id"] == "e1"
    assert len(result["unused_experiences"]) == 1
    assert result["unsupported_claims"][0]["claim"] == "매출 300% 증가"
    assert result["revision_directions"] == ["프로젝트 B의 성과 수치를 한 줄 보강하세요."]


def test_normalize_empty_and_invalid():
    assert PortfolioReviewService._normalize(None) is None
    assert PortfolioReviewService._normalize([]) is None
    result = PortfolioReviewService._normalize({
        "relevant_experiences": "bad",
        "unused_experiences": [{"title": "만 있음"}],
        "unsupported_claims": [{"claim": ""}],
        "revision_directions": ["  ", "방향"],
    })
    assert result is not None
    assert result["relevant_experiences"] == []
    assert result["unused_experiences"][0]["title"] == "만 있음"
    assert result["unsupported_claims"] == []
    assert result["revision_directions"] == ["방향"]
