from datetime import date

from app.services.experience_period import format_experience_period


def test_ended_experience_is_past():
    line = format_experience_period(date(2019, 3, 1), date(2021, 8, 31))
    assert line == "기간: 2019-03-01 ~ 2021-08-31 (종료 · 과거 경험. 현재 담당처럼 쓰지 말 것)"


def test_ongoing_experience_is_present():
    line = format_experience_period(date(2024, 1, 1), None)
    assert line == "기간: 2024-01-01 ~ 진행중 (현재 담당. 이 경험만 현재형 가능)"


def test_missing_dates_omitted():
    assert format_experience_period(None, None) is None
