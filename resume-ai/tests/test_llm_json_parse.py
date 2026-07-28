import pytest

from app.services.llm_service import LlmService


@pytest.fixture
def parser() -> LlmService:
    return LlmService()


def test_parse_json_value_plain_object(parser: LlmService) -> None:
    parsed = parser.parse_json_value('{"matched": ["java"], "missing": []}')
    assert parsed == {"matched": ["java"], "missing": []}


def test_parse_json_value_markdown_fence(parser: LlmService) -> None:
    text = """```json
[
  {"sentence_index": 0, "level": "YELLOW"}
]
```"""
    parsed = parser.parse_json_value(text)
    assert isinstance(parsed, list)
    assert parsed[0]["level"] == "YELLOW"


def test_parse_json_value_preamble_and_fence(parser: LlmService) -> None:
    text = """Here is the result:
```json
{"matched": ["spring"], "missing": ["k8s"], "recommended": [], "overused": []}
```
"""
    parsed = parser.parse_json_value(text)
    assert isinstance(parsed, dict)
    assert parsed["matched"] == ["spring"]


def test_parse_json_value_array_with_prefix_text(parser: LlmService) -> None:
    text = 'Analysis:\n[{"category": "기술", "question": "질문?", "difficulty": "NORMAL"}]'
    parsed = parser.parse_json_value(text)
    assert isinstance(parsed, list)
    assert parsed[0]["category"] == "기술"


def test_parse_json_value_empty_string(parser: LlmService) -> None:
    assert parser.parse_json_value("") is None
    assert parser.parse_json_value("   ") is None


def test_parse_json_value_truncated_object(parser: LlmService) -> None:
    text = '{"matched": ["java", "spring", "HTML/CSS/JavaScript'
    parsed = parser.parse_json_value(text)
    assert isinstance(parsed, dict)
    assert "java" in parsed["matched"]
    assert "spring" in parsed["matched"]


def test_looks_truncated_resume_respects_section_length(parser: LlmService) -> None:
    # 섹션 모드: 극단적으로 짧을 때만 truncated (분량보다 사실 우선)
    short = "가" * 80 + ".\n\n" + "나" * 80 + "."
    assert parser._looks_truncated_resume(short, experience_count=2, section_count=2) is True

    long_para = ("경험과 성과를 구체적으로 서술합니다. " * 20).strip() + "다."
    long = f"{long_para}\n\n{long_para}"
    assert len(long_para) >= 200
    assert parser._looks_truncated_resume(long, experience_count=2, section_count=2) is False


def test_rewrite_level_rules_forbid_fabrication(parser: LlmService) -> None:
    rules = parser._rewrite_level_rules(100)
    assert "100%" in rules
    assert "허구" in rules
    assert "사실" in rules


def test_normalize_section_paragraphs_merges_extras(parser: LlmService) -> None:
    content = "첫번째.\n\n두번째.\n\n세번째.\n\n네번째."
    normalized = parser._normalize_section_paragraphs(content, 3)
    paras = [p for p in normalized.split("\n\n") if p.strip()]
    assert len(paras) == 3
    assert "세번째" in paras[2] and "네번째" in paras[2]


def test_clean_single_section_collapses_inner_breaks(parser: LlmService) -> None:
    raw = "지원동기\n\n mona 문장 하나.\n\n문장 둘."
    cleaned = parser._clean_single_section(raw, "지원동기")
    assert "\n\n" not in cleaned
    assert "문장 하나" in cleaned


def test_style_violations_detects_translationese(parser: LlmService) -> None:
    text = (
        "이 경험은 저에게 큰 도움이 될 것입니다. "
        "협업은 팀워크의 중요성을 깨닫게 되었습니다. "
        "고객의 요구를 정확히 이해해 주었습니다."
    )
    violations = parser._style_violations(text)
    assert "큰 도움이 될 것입니다" in violations
    assert "깨닫게 되었습니다" in violations
    assert "해 주었습니다" in violations


def test_style_violations_detects_leading_adverb_comma(parser: LlmService) -> None:
    text = "특히, Spring Boot로 백엔드를 설계했습니다. 또한, 쿼리를 튜닝했습니다."
    violations = parser._style_violations(text)
    assert any(v.startswith("특히") or v.startswith("또한") for v in violations)


def test_style_violations_passes_natural_korean(parser: LlmService) -> None:
    text = (
        "CMS 신규 구축에서 Spring Boot 백엔드와 MS-SQL 쿼리 튜닝을 맡았습니다. "
        "장애 원인을 로그로 추적해 응답 시간을 줄였습니다. "
        "고객사와 인터페이스 명세를 맞춰 연동 일정을 지켰습니다."
    )
    assert parser._style_violations(text) == []


def test_style_violations_detects_many_commas(parser: LlmService) -> None:
    text = "저는 Java와 Spring Boot를 활용해, 백엔드 시스템을 설계하고, 안정화를 이끌었습니다."
    violations = parser._style_violations(text)
    assert "쉼표 2개+" in violations


def test_style_violations_detects_cliche_help_and_collab(parser: LlmService) -> None:
    text = (
        "이러한 경험은 저에게 큰 도움이 되었습니다. "
        "팀원들과 일하며 협업의 중요성을 깨달았습니다."
    )
    violations = parser._style_violations(text)
    assert "큰 도움이 되었습니다" in violations
    assert "협업의 중요성을 깨달" in violations


def test_style_violations_repeat_phrase_once_ok(parser: LlmService) -> None:
    text = "이를 통해 병목 구간을 찾아 쿼리를 고쳤습니다. 이후 배포 체크리스트를 정리했습니다."
    violations = parser._style_violations(text)
    assert not any(v.startswith("반복:") for v in violations)


def test_style_violations_repeat_phrase_twice_flagged(parser: LlmService) -> None:
    text = (
        "이를 통해 병목을 찾았습니다. "
        "이를 통해 배포 절차도 정리했습니다."
    )
    violations = parser._style_violations(text)
    assert any("반복: 이를 통해" in v for v in violations)


def test_section_topic_violations_motivation_rejects_ai_tools(parser: LlmService) -> None:
    text = (
        "CMS 구축 경험을 바탕으로 지원합니다. "
        "저는 AI 도구를 활용하여 개발 생산성을 향상시킨 경험도 있습니다. "
        "Claude Code와 Cursor를 도입했습니다."
    )
    v = parser._section_topic_violations("지원동기", text)
    assert any("AI도구" in x for x in v)


def test_section_topic_violations_motivation_allows_cms_only(parser: LlmService) -> None:
    text = (
        "CMS 신규 구축에서 Spring Boot 백엔드를 맡으며 "
        "규제 대응 도메인 경험이 이 직무와 맞다고 판단했습니다."
    )
    assert parser._section_topic_violations("지원동기", text) == []


def test_section_slot_rules_motivation_mentions_ai_ban(parser: LlmService) -> None:
    rules = parser._section_slot_rules("지원동기")
    assert "AI" in rules
    assert "금지" in rules
