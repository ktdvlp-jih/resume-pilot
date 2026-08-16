"""첨삭 점수 0~100 정규화."""

from app.services.generation_service import normalize_review_scores


def test_five_point_scale_becomes_0_100():
    scaled = normalize_review_scores({
        "company_fit": 4,
        "style_retention": 4,
        "star_application": 4,
        "experience_utilization": 5,
    })
    assert scaled == {
        "company_fit": 80,
        "style_retention": 80,
        "star_application": 80,
        "experience_utilization": 100,
    }


def test_already_100_scale_unchanged():
    scaled = normalize_review_scores({
        "company_fit": 72,
        "style_retention": 80,
        "star_application": 64,
        "experience_utilization": 90,
    })
    assert scaled == {
        "company_fit": 72,
        "style_retention": 80,
        "star_application": 64,
        "experience_utilization": 90,
    }


def test_ten_point_scale():
    scaled = normalize_review_scores({
        "company_fit": 8,
        "style_retention": 7,
        "star_application": 6,
        "experience_utilization": 9,
    })
    assert scaled == {
        "company_fit": 80,
        "style_retention": 70,
        "star_application": 60,
        "experience_utilization": 90,
    }
