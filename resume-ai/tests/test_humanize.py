"""AI_HUMANIZE 치환 정규화."""

from app.services.generation_service import HumanizeService


def test_apply_replacements_first_match_only():
    content = "이를 통해 역량을 키웠습니다. 이를 통해 팀에 기여했습니다."
    next_content, applied = HumanizeService.apply_replacements(
        content,
        [
            {
                "original": "이를 통해 역량을 키웠습니다.",
                "revised": "장애 대응으로 운영 역량을 키웠습니다.",
                "reason": "문두 접속사",
            }
        ],
    )
    assert next_content.startswith("장애 대응으로 운영 역량을 키웠습니다.")
    assert "이를 통해 팀에 기여했습니다." in next_content
    assert len(applied) == 1


def test_apply_replacements_skips_unknown_and_unchanged():
    content = "관세청에서 3명을 교육했습니다."
    next_content, applied = HumanizeService.apply_replacements(
        content,
        [
            {"original": "없는 문장입니다.", "revised": "바꿔도 안 들어감", "reason": "x"},
            {
                "original": "관세청에서 3명을 교육했습니다.",
                "revised": "관세청에서 3명을 교육했습니다.",
                "reason": "동일",
            },
        ],
    )
    assert next_content == content
    assert applied == []


def test_apply_replacements_respects_target_allowlist():
    content = "또한 협업했습니다. 핵심적인 성과를 냈습니다."
    next_content, applied = HumanizeService.apply_replacements(
        content,
        [
            {
                "original": "또한 협업했습니다.",
                "revised": "기획과 개발이 같은 표로 일했습니다.",
                "reason": "접속사",
            },
            {
                "original": "핵심적인 성과를 냈습니다.",
                "revised": "배포 시간을 줄였습니다.",
                "reason": "유행어",
            },
        ],
        targets=["또한 협업했습니다."],
    )
    assert "기획과 개발이 같은 표로 일했습니다." in next_content
    assert "핵심적인 성과를 냈습니다." in next_content
    assert len(applied) == 1


def test_apply_replacements_empty_targets_allows_whole_document():
    content = "이를 통해 기여하고자 합니다. 핵심적인 성과를 냈습니다."
    next_content, applied = HumanizeService.apply_replacements(
        content,
        [
            {
                "original": "이를 통해 기여하고자 합니다.",
                "revised": "병목을 찾아 쿼리를 고쳤습니다.",
                "reason": "클리셰",
            },
            {
                "original": "핵심적인 성과를 냈습니다.",
                "revised": "배포 시간을 줄였습니다.",
                "reason": "유행어",
            },
        ],
        targets=[],
    )
    assert "병목을 찾아 쿼리를 고쳤습니다." in next_content
    assert "배포 시간을 줄였습니다." in next_content
    assert len(applied) == 2


def test_parse_analysis_sorts_and_counts_severity():
    analysis = HumanizeService.parse_analysis({
        "analysis": {
            "grade": "B",
            "grade_reason": "S1은 줄었고 격식체는 남음",
            "findings": [
                {"pattern": 3, "severity": "S2", "title": "연결어미 뒤 쉼표", "example": "했고,", "why": "영어식 쉼표"},
                {"pattern": 35, "severity": "s1", "title": "추상 주어", "example": "맞닿아 있다", "why": "의인화"},
                {"pattern": "x", "severity": "S9", "title": "무시", "example": "x", "why": "x"},
            ],
        }
    })
    assert analysis["grade"] == "B"
    assert analysis["s1"] == 1
    assert analysis["s2"] == 1
    assert analysis["s3"] == 0
    assert analysis["findings"][0]["pattern"] == 35
    assert analysis["findings"][0]["severity"] == "S1"
    assert analysis["findings"][1]["pattern"] == 3


def test_parse_analysis_missing_defaults_grade():
    analysis = HumanizeService.parse_analysis({"analysis": {"findings": []}})
    assert analysis["grade"] == "A"
    assert analysis["findings"] == []
    assert HumanizeService.parse_analysis({})["grade"] == ""
