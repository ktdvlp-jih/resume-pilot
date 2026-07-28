import asyncio

from app.services.job_analysis_service import JobAnalysisService, job_analysis_service


def test_job_board_detail_urls_saramin():
    url = (
        "https://www.saramin.co.kr/zf_user/jobs/relay/view"
        "?isMypage=no&rec_idx=54462759&view_type=search"
    )
    details = JobAnalysisService._job_board_detail_urls(url)
    assert details == [
        "https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=54462759"
    ]


def test_job_board_detail_urls_jobkorea():
    url = "https://www.jobkorea.co.kr/Recruit/GI_Read/49622317?Oem_Code=C1&sc=726"
    details = JobAnalysisService._job_board_detail_urls(url)
    assert details == [
        "https://www.jobkorea.co.kr/Recruit/GI_Read_Comt_Ifrm"
        "?Gno=49622317&isHiringCenter=false&hideMapView=false"
    ]


def test_job_board_detail_urls_unknown():
    assert JobAnalysisService._job_board_detail_urls("https://example.com/jobs/1") == []


def test_looks_like_job_detail():
    rich = "주요업무\nAPI 개발\n자격요건\n경력 3년\n우대사항\nSpring"
    assert JobAnalysisService._looks_like_job_detail(rich * 20)
    assert not JobAnalysisService._looks_like_job_detail("로그인 회원가입 전체메뉴")


def test_fetch_url_prefers_saramin_detail(monkeypatch):
    calls: list[str] = []

    class FakeResponse:
        def __init__(self, text: str, status_code: int = 200):
            self.text = text
            self.status_code = status_code

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, headers=None):
            calls.append(url)
            if "view-detail" in url:
                body = (
                    "<html><body><h1>상세</h1><p>주요업무 API</p>"
                    "<p>자격요건 Java Spring</p><p>우대사항 ITSM</p>"
                    + ("상세내용 " * 80)
                    + "</body></html>"
                )
                return FakeResponse(body)
            return FakeResponse("<html><body>로그인 사람인 네비게이션만 " + ("메뉴 " * 200) + "</body></html>")

    import app.services.job_analysis_service as mod

    monkeypatch.setattr(mod.httpx, "AsyncClient", FakeClient)
    text = asyncio.run(
        job_analysis_service._fetch_url(
            "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54462759"
        )
    )
    assert text is not None
    assert "주요업무" in text
    assert "자격요건" in text
    assert "로그인" not in text or text.find("주요업무") < text.find("로그인")
    assert any("view-detail" in c for c in calls)


def test_fetch_url_prefers_jobkorea_iframe(monkeypatch):
    class FakeResponse:
        def __init__(self, text: str, status_code: int = 200):
            self.text = text
            self.status_code = status_code

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, headers=None):
            if "GI_Read_Comt_Ifrm" in url:
                body = (
                    "<html><body><p>담당업무 공공기관 SI java개발</p>"
                    "<p>자격요건 경력5년</p><p>우대사항 Restful API</p>"
                    + ("상세 " * 80)
                    + "</body></html>"
                )
                return FakeResponse(body)
            return FakeResponse("<html><body>모집요강 요약만 " + ("요약 " * 200) + "</body></html>")

    import app.services.job_analysis_service as mod

    monkeypatch.setattr(mod.httpx, "AsyncClient", FakeClient)
    text = asyncio.run(
        job_analysis_service._fetch_url(
            "https://www.jobkorea.co.kr/Recruit/GI_Read/49661941"
        )
    )
    assert text is not None
    assert "담당업무" in text
    assert "경력5년" in text


def test_canonicalize_job_url_strips_searchword():
    dirty = (
        "https://www.saramin.co.kr/zf_user/jobs/relay/view"
        "?isMypage=no&rec_idx=54462759"
        "&searchword=%EA%B3%A0%EB%A0%A4%EC%8B%A0%EC%9A%A9%EC%A0%95%EB%B3%B4"
        "&view_type=search"
    )
    assert JobAnalysisService._canonicalize_job_url(dirty) == (
        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54462759"
    )


def test_looks_like_url_only():
    assert JobAnalysisService._looks_like_url_only(
        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=1&searchword=foo"
    )
    assert not JobAnalysisService._looks_like_url_only(
        "주요업무\n자격요건\n우대사항\n" + ("내용 " * 50)
    )


def test_analyze_url_does_not_fallback_to_url_string(monkeypatch):
    async def fail_fetch(url: str):
        return None

    monkeypatch.setattr(job_analysis_service, "_fetch_url", fail_fetch)
    result = asyncio.run(
        job_analysis_service.analyze(
            "URL",
            content="",
            source_url=(
                "https://www.saramin.co.kr/zf_user/jobs/relay/view"
                "?rec_idx=54462759&searchword=%EA%B3%A0%EB%A0%A4%EC%8B%A0%EC%9A%A9%EC%A0%95%EB%B3%B4"
            ),
        )
    )
    assert result.get("error") == "url fetch failed"
    assert result.get("company_name") == "Unknown"
