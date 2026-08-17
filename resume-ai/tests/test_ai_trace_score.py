"""어절 가중 AI 흔적·자연스러움 점수."""

from app.services.ai_trace_score import score_detections


def _row(sentence: str, level: str) -> dict[str, str]:
    return {"sentence": sentence, "level": level}


def test_equal_length_one_red_matches_old_ratio():
    rows = [_row("구체적인 장애 대응으로 응답 시간을 줄였습니다.", "GREEN")] * 29
    rows.append(_row("이를 통해 역량을 발휘하고자 합니다.", "RED"))
    scored = score_detections(rows)
    # 어절 수가 비슷하면 예전(RED/전체)과 크게 다르지 않다
    assert 2.0 <= scored["ai_trace_percent"] <= 5.0


def test_yellow_counts_unlike_old_red_only():
    green = "로그로 원인을 찾아 쿼리를 고쳤습니다."
    yellow = "또한 팀과 협업하며 시너지를 창출했습니다."
    scored = score_detections([_row(green, "GREEN"), _row(yellow, "YELLOW")])
    assert scored["ai_trace_percent"] > 0
    assert scored["ai_trace_percent"] < 50


def test_longer_red_weighs_more_than_short_red():
    green = "배포 체크리스트를 만들어 장애를 줄였습니다."
    short_red = "기여하고자 합니다."
    long_red = (
        "이를 통해 핵심적인 역량을 지속적으로 발휘하여 혁신적인 성과를 창출하고 "
        "회사에 기여하고자 합니다."
    )
    short = score_detections([_row(green, "GREEN"), _row(short_red, "RED")])
    long = score_detections([_row(green, "GREEN"), _row(long_red, "RED")])
    assert long["ai_trace_percent"] > short["ai_trace_percent"]


def test_green_heuristic_raises_trace():
    clean = "CMS 구축에서 Spring Boot API를 맡았습니다."
    cliche = "이러한 경험은 저에게 큰 도움이 되었습니다."
    scored = score_detections([_row(clean, "GREEN"), _row(cliche, "GREEN")])
    assert scored["ai_trace_percent"] > 0


def test_naturalness_not_always_inverse_when_rhythm_flat():
    same = "저는 백엔드 개발을 하며 서비스를 안정화했습니다."
    rows = [_row(same, "GREEN") for _ in range(6)]
    scored = score_detections(rows)
    assert scored["ai_trace_percent"] == 0.0
    assert scored["naturalness"] < 100.0


def test_empty_detections_are_clean():
    assert score_detections([]) == {"ai_trace_percent": 0.0, "naturalness": 100.0}


def test_consecutive_flagged_sentences_weigh_more_than_isolated():
    green = "로그로 병목을 찾아 인덱스를 추가했습니다."
    yellow = "또한 팀과 협업하며 시너지를 창출했습니다."
    isolated = score_detections([
        _row(green, "GREEN"),
        _row(yellow, "YELLOW"),
        _row(green, "GREEN"),
    ])
    clustered = score_detections([
        _row(green, "GREEN"),
        _row(yellow, "YELLOW"),
        _row("이를 통해 핵심 역량을 발휘하고자 합니다.", "RED"),
        _row(green, "GREEN"),
    ])
    assert clustered["ai_trace_percent"] > isolated["ai_trace_percent"]
