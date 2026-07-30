#!/usr/bin/env python3
"""다직군 가상 계정 E2E: 가입 → 경험 30 → 임베딩 → 공고/추천/생성 → 검증."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date

BASE = os.environ.get("E2E_API_BASE", "http://127.0.0.1:8080")
EMAIL = f"e2e-multi-{int(time.time())}@example.com"
PASSWORD = os.environ.get("E2E_PASSWORD")
NAME = "E2E다직군테스터"
if not PASSWORD:
    raise SystemExit("E2E_PASSWORD 환경변수를 설정하세요.")


# 결과 리포트에 이메일만 (비밀번호 출력 금지)
REPORT: dict = {"email": EMAIL, "steps": [], "checks": []}


def api(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            payload = json.loads(raw) if raw else {}
            if not payload.get("success", True):
                raise RuntimeError(payload.get("error") or payload)
            return payload.get("data", payload)
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        raise RuntimeError(f"{method} {path} -> {e.code}: {err[:800]}") from e


def step(msg: str):
    print(f"· {msg}", flush=True)
    REPORT["steps"].append(msg)


def check(name: str, ok: bool, detail: str = ""):
    REPORT["checks"].append({"name": name, "ok": ok, "detail": detail})
    mark = "PASS" if ok else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""), flush=True)


def make_experiences() -> list[dict]:
    """서로 다른 직군·도메인 경험 ~30건 (특정 사용자 CMS/SI 편향 없음)."""
    rows: list[tuple] = [
        # 개발 (5)
        ("PROJECT", "쇼핑몰 프론트엔드 리뉴얼", "React 기반 상품·결제 UX 개선", "프론트엔드 개발자",
         "공통 컴포넌트 정리와 번들 최적화로 LCP를 개선했다", "전환율 상승", None,
         "레거시 jQuery UI 유지보수 비용이 컸다", "React로 마이그레이션", "디자인시스템 컴포넌트화",
         "주요 페이지 LCP 개선", ["React", "TypeScript", "Webpack"], "2021-03-01", "2022-01-31"),
        ("PROJECT", "사내 백엔드 API 게이트웨이", "Spring Boot로 인증·라우팅 통일", "백엔드 개발자",
         "JWT 인증과 rate limit을 도입했다", "장애 감소", None,
         "마이크로서비스 인증이 제각각이었다", "공통 게이트웨이 필요", "Spring Cloud Gateway 구성",
         "인증 오류 티켓 감소", ["Java", "Spring Boot", "Redis"], "2019-06-01", "2020-12-31"),
        ("PROJECT", "모바일 앱 푸시 알림 시스템", "FCM 기반 캠페인 발송", "모바일 개발자",
         "실패 재시도 큐를 설계했다", "도달률 향상", None,
         "푸시 실패가 잦았다", "안정적 발송", "큐·재시도 구현", "실패율 감소", ["Kotlin", "FCM"], "2020-01-01", "2020-08-31"),
        ("TECHNOLOGY", "CI/CD 파이프라인 구축", "GitHub Actions로 배포 자동화", "DevOps 엔지니어",
         "스테이징·프로덕션 분리 배포", "배포 시간 단축", "배포 40분→8분",
         "수동 배포 실수가 잦았다", "자동화", "워크플로 작성", "롤백 절차 문서화", ["Docker", "GitHub Actions"], "2022-02-01", "2022-06-30"),
        ("PROJECT", "데이터 파이프라인 배치", "일별 매출 집계 ETL", "데이터 엔지니어",
         "Airflow DAG로 스케줄링", "리포트 자동화", None,
         "엑셀 수작업 집계", "자동화 필요", "Python ETL 작성", "매일 아침 리포트 제공", ["Python", "Airflow", "PostgreSQL"], "2021-09-01", "2022-03-31"),
        # 간호·의료 (3)
        ("PROJECT", "병동 투약 체크리스트 개선", "투약 오류 예방 프로세스", "간호사",
         "더블체크 체크리스트를 도입했다", "투약 오류 감소", None,
         "야간 투약 누락 사례", "프로세스 표준화", "체크리스트·인수인계 양식", "누락 건수 감소", ["환자안전"], "2018-03-01", "2019-02-28"),
        ("COLLABORATION", "응급 환자 다학제 대응", "응급실 협진 커뮤니케이션", "응급실 간호사",
         "의사·방사선과와 타임라인 공유", "골든타임 확보", None,
         "인수인계 누락", "정보 공유 체계", "화이트보드·브리핑", "대응 시간 단축", ["응급간호"], "2019-04-01", "2020-01-31"),
        ("ACHIEVEMENT", "감염관리 교육 이수 및 적용", "손위생·격리 지침 현장 적용", "병동 간호사",
         "신규 직원 오리엔테이션 진행", "감염 지표 개선", None,
         "지침 숙지 편차", "교육 표준화", "월 1회 교육", "손위생 준수율 상승", ["감염관리"], "2020-05-01", "2020-11-30"),
        # 교육 (3)
        ("PROJECT", "중학생 수학 보충 수업 설계", "수준별 문제 세트 제작", "수학 교사",
         "진단평가 후 맞춤 과제", "평균 점수 상승", None,
         "학습 격차", "개별화", "문제은행 분류", "하위권 향상", ["교육과정"], "2017-03-01", "2018-02-28"),
        ("LEADERSHIP", "학급 자치회 운영", "학급 규칙·행사 기획", "담임 교사",
         "학생 주도 회의 진행", "갈등 감소", None,
         "규칙 미준수", "자치 강화", "주간 회의", "민원 감소", ["생활지도"], "2018-03-01", "2019-02-28"),
        ("ACHIEVEMENT", "온라인 수업 전환 지원", "화상수업 도구 도입", "교사",
         "학부모 안내문·녹화본 제공", "출석률 유지", None,
         "코로나 원격수업", "도구 정착", "가이드 배포", "출석 안정", ["Zoom", "패들렛"], "2020-03-01", "2020-08-31"),
        # 마케팅 (3)
        ("PROJECT", "신제품 런칭 캠페인", "SNS·검색광고 통합", "퍼포먼스 마케터",
         "크리에이티브 A/B 테스트", "CAC 개선", "CAC 18% 감소",
         "전환 비용 상승", "채널 재배분", "소재 실험", "목표 CPA 달성", ["Meta Ads", "GA4"], "2021-01-01", "2021-06-30"),
        ("PROJECT", "브랜드 콘텐츠 캘린더", "월간 콘텐츠 기획", "콘텐츠 마케터",
         "SEO 키워드 매핑", "유입 증가", None,
         "발행 일정 불규칙", "캘린더 운영", "주제 파이프라인", "오가닉 유입 증가", ["SEO", "Notion"], "2022-01-01", "2022-07-31"),
        ("COLLABORATION", "인플루언서 협업 캠페인", "리뷰·언박싱 협업", "마케팅 담당",
         "계약·가이드라인 정리", "도달 확대", None,
         "메시지 일관성 부족", "가이드 제공", "검수 프로세스", "부정 리뷰 이슈 0", ["인플루언서"], "2022-08-01", "2022-12-31"),
        # 회계·재무 (2)
        ("PROJECT", "월결산 자동화 스프레드시트", "계정과목 매핑 매크로", "회계 담당",
         "반복 전표 검증 규칙", "결산 일수 단축", "결산 5일→3일",
         "수작업 대조", "자동화", "스크립트 작성", "야근 감소", ["Excel", "회계"], "2019-01-01", "2019-09-30"),
        ("PROBLEM_SOLVING", "부가세 신고 오류 정정", "누락 세금계산서 추적", "세무 보조",
         "거래처별 대사표 작성", "가산세 회피", None,
         "신고 전 불일치", "전수 대사", "누락분 수정신고", "가산세 0", ["세무"], "2020-07-01", "2020-07-31"),
        # 디자인 (2)
        ("PROJECT", "앱 온보딩 UI 리디자인", "첫 주 이탈 개선", "UI 디자이너",
         "프로토타입 사용성 테스트", "완주율 상승", None,
         "온보딩 이탈", "플로우 단순화", "Figma 프로토타입", "완주율 개선", ["Figma", "UX"], "2021-04-01", "2021-10-31"),
        ("ACHIEVEMENT", "디자인 시스템 토큰 정리", "컬러·타이포 토큰화", "프로덕트 디자이너",
         "개발과 네이밍 합의", "구현 일관성", None,
         "스타일 파편화", "토큰 정의", "문서화", "핸드오프 시간 단축", ["Design Token"], "2022-03-01", "2022-09-30"),
        # 영업 (2)
        ("ACHIEVEMENT", "신규 거래처 발굴", "B2B 미팅·제안", "영업 사원",
         "니즈 인터뷰 후 맞춤 제안", "계약 체결", "분기 신규 12건",
         "파이프라인 부족", "콜드콜·소개", "제안서 작성", "목표 초과", ["CRM"], "2018-01-01", "2018-12-31"),
        ("COLLABORATION", "고객 클레임 대응", "납기 지연 협의", "영업 담당",
         "생산·물류와 일정 재조정", "계약 유지", None,
         "납기 지연 통보", "대안 일정", "주간 싱크", "해지 방지", ["협상"], "2019-05-01", "2019-06-30"),
        # PM (2)
        ("LEADERSHIP", "모바일 개편 프로젝트 리딩", "스코프·일정 관리", "프로덕트 매니저",
         "우선순위 워크숍 진행", "일정 내 출시", None,
         "요구사항 폭주", "MVP 정의", "백로그 정리", "예정일 출시", ["Jira", "Roadmap"], "2020-02-01", "2020-11-30"),
        ("PROBLEM_SOLVING", "장애 사후분석 프로세스", "포스트모템 템플릿", "프로젝트 매니저",
         "재발 방지 액션 추적", "동일 장애 재발 감소", None,
         "장애 원인 공유전무", "표준 양식", "액션 오너 지정", "재발 감소", ["포스트모템"], "2021-07-01", "2021-12-31"),
        # HR (2)
        ("PROJECT", "채용 인터뷰 루브릭", "직무별 평가 기준", "HR 담당",
         "면접관 교육 세션", "평가 편차 감소", None,
         "주관적 평가", "기준 통일", "루브릭 배포", "이의제기 감소", ["채용"], "2019-02-01", "2019-08-31"),
        ("COLLABORATION", "온보딩 30일 프로그램", "멘토·체크리스트", "인사 담당",
         "부서별 온보딩 맵", "조기 퇴사율 개선", None,
         "입사 초기 이탈", "체계화", "멘토 매칭", "90일 잔존율 상승", ["온보딩"], "2020-09-01", "2021-03-31"),
        # 외식 (2)
        ("LEADERSHIP", "저녁 피크 타임 동선 개선", "주방·홀 역할 재배치", "레스토랑 매니저",
         "동선 시뮬레이션 후 배치", "대기시간 감소", None,
         "피크 혼잡", "동선 재설계", "역할 카드", "대기 감소", ["매장운영"], "2017-06-01", "2018-01-31"),
        ("ACHIEVEMENT", "원가율 관리 시트", "식자재 발주 최적화", "주방장",
         "폐기량 기록·발주 조정", "원가율 안정", "원가율 32%→28%",
         "폐기 과다", "기록 습관화", "주간 리뷰", "목표 원가 유지", ["원가관리"], "2018-02-01", "2018-10-31"),
        # 법률 (2)
        ("PROJECT", "계약서 검토 체크리스트", "표준 조항 리스크 표시", "법무 어시스턴트",
         "부서별 필수 조항 정리", "누락 조항 감소", None,
         "검토 기준 불명확", "체크리스트", "교육", "재검토 요청 감소", ["계약"], "2019-03-01", "2019-11-30"),
        ("PROBLEM_SOLVING", "개인정보 처리방침 개정", "법령 개정 반영", "컴플라이언스 담당",
         "개정 조항 매핑표", "기한 내 게시", None,
         "법령 개정", "방침 업데이트", "법무 검수", "기한 준수", ["개인정보"], "2021-08-01", "2021-09-30"),
        # 데이터 분석 (2)
        ("PROJECT", "이탈 고객 코호트 분석", "가입 경로별 잔존", "데이터 분석가",
         "대시보드로 주간 공유", "리텐션 실험 근거", None,
         "이탈 원인 불명", "코호트 분해", "SQL·시각화", "온보딩 실험 착수", ["SQL", "Tableau"], "2022-01-01", "2022-05-31"),
        ("ACHIEVEMENT", "광고 성과 어트리뷰션 정리", "채널 기여도 재정의", "그로스 분석가",
         "멀티터치 모델 비교", "예산 재배분", None,
         "라스트클릭 왜곡", "모델 비교", "리포트", "채널 ROI 개선", ["Attribution", "Python"], "2022-06-01", "2022-11-30"),
    ]
    assert len(rows) == 30, len(rows)
    out = []
    for r in rows:
        out.append({
            "type": r[0],
            "title": r[1],
            "description": r[2],
            "role": r[3],
            "contribution": r[4],
            "result": r[5],
            "numericResult": r[6],
            "starSituation": r[7],
            "starTask": r[8],
            "starAction": r[9],
            "starResult": r[10],
            "skills": r[11],
            "startDate": r[12],
            "endDate": r[13],
        })
    return out


DOMAIN_LEAK = re.compile(
    r"\bSI\s*개발|SI/실무|졸업 후 SI|대학 시절 CMS|\bCMS\b|\bMSDS\b|애경|한화큐셀|켐토피아",
    re.I,
)


def main() -> int:
    t0 = time.time()
    step(f"회원가입 {EMAIL}")
    tokens = api("POST", "/api/v1/auth/signup", body={"email": EMAIL, "password": PASSWORD, "name": NAME})
    token = tokens["accessToken"]
    me = api("GET", "/api/v1/users/me", token)
    REPORT["userId"] = me.get("id")
    check("signup", bool(token and me.get("id")), f"user={me.get('id')}")

    step("경험 30건 생성")
    created = []
    for i, exp in enumerate(make_experiences(), 1):
        row = api("POST", "/api/v1/experiences", token, exp, timeout=60)
        created.append(row)
        if i % 10 == 0:
            print(f"    … {i}/30", flush=True)
    ids = [c["id"] for c in created]
    check("experiences_count", len(ids) == 30, str(len(ids)))
    roles = {c.get("role") for c in created}
    check("roles_diversity", len(roles) >= 15, f"unique_roles={len(roles)}")

    step("RAG 임베딩 embed-all")
    emb = api("POST", "/api/v1/experiences/embed-all", token, timeout=300)
    check("embed_all", (emb or {}).get("count", 0) >= 20, str(emb))

    # —— 공고 A: 프론트엔드 개발자
    step("공고A 업로드 (프론트엔드)")
    job_fe = api(
        "POST",
        "/api/v1/job-postings/upload",
        token,
        {
            "sourceType": "TEXT",
            "title": "프론트엔드 개발자 (가상)",
            "content": (
                "회사: 북극성커머스\n모집: 프론트엔드 개발자\n"
                "담당: React/TypeScript 기반 웹 서비스 UI 개발, 디자인시스템 협업, 성능 최적화\n"
                "자격: React 실무 2년+, TypeScript, REST API 연동\n"
                "우대: Webpack/Vite, 접근성, A/B 테스트 경험\n"
            ),
        },
        timeout=180,
    )
    job_fe_id = job_fe["id"]
    analysis_fe = api("GET", f"/api/v1/job-postings/{job_fe_id}/analysis", token)
    check("job_fe_analysis", bool(analysis_fe), f"company={analysis_fe.get('companyName')}")

    step("추천A (프론트엔드 키워드)")
    rec_fe = api(
        "POST",
        "/api/v1/rag/recommend-experiences",
        token,
        {
            "keywords": ["React", "TypeScript", "프론트엔드", "UI", "웹", "성능"],
            "topK": 30,
            "minScore": 0.28,
        },
        timeout=120,
    )
    rec_fe = rec_fe or []
    titles_fe = [r.get("title", "") for r in rec_fe]
    check("recommend_fe_count", len(rec_fe) >= 3, f"n={len(rec_fe)} top={titles_fe[:5]}")
    fe_hit = any("프론트" in t or "온보딩 UI" in t or "디자인 시스템" in t or "리뉴얼" in t for t in titles_fe[:8])
    nurse_top = any("투약" in t or "응급" in t or "감염" in t for t in titles_fe[:3])
    check("recommend_fe_relevant", fe_hit and not nurse_top, f"top3={titles_fe[:3]}")

    # 생성A: 상위 관련 경험 최대 5
    pick_fe = [r["id"] for r in rec_fe[:5]]
    if len(pick_fe) < 2:
        pick_fe = [c["id"] for c in created if "개발" in (c.get("role") or "") or "디자이너" in (c.get("role") or "")][:5]

    step("자소서 생성A (프론트엔드, 문항 3)")
    gen_fe = api(
        "POST",
        "/api/v1/ai/generate",
        token,
        {
            "keywords": ["React", "TypeScript", "프론트엔드"],
            "rewriteLevel": 40,
            "jobPostingId": job_fe_id,
            "jobAnalysis": analysis_fe,
            "sectionTitles": ["성장과정", "직무역량", "지원동기"],
            "experienceIds": pick_fe,
        },
        timeout=600,
    )
    content_fe = (gen_fe or {}).get("content") or ""
    REPORT["gen_fe_len"] = len(content_fe)
    paras_fe = [p.strip() for p in content_fe.split("\n\n") if p.strip()]
    check("gen_fe_nonempty", len(content_fe) >= 200, f"chars={len(content_fe)} paras={len(paras_fe)}")
    check("gen_fe_no_domain_leak", not DOMAIN_LEAK.search(content_fe), (DOMAIN_LEAK.search(content_fe) or [""])[0] if DOMAIN_LEAK.search(content_fe) else "")
    # 간호 고유 용어가 프론트 자소서에 장문으로 들어가면 실패
    nurse_leak = sum(1 for w in ("투약", "병동", "감염관리", "응급실") if w in content_fe)
    check("gen_fe_no_nurse_mix", nurse_leak == 0, f"hits={nurse_leak}")
    # 문단 간 동일 프로젝트명 장문 반복 완화 확인 (완벽하진 않음)
    if len(paras_fe) >= 2:
        # 가장 긴 공통 20자 연속 출현
        overlap = False
        for a, b in zip(paras_fe, paras_fe[1:]):
            for i in range(0, max(0, len(a) - 40)):
                chunk = a[i : i + 40]
                if chunk and chunk in b:
                    overlap = True
                    break
            if overlap:
                break
        check("gen_fe_low_verbatim_overlap", not overlap, "40자 연속 중복" if overlap else "ok")

    # —— 공고 B: 간호사
    step("공고B 업로드 (간호사)")
    job_rn = api(
        "POST",
        "/api/v1/job-postings/upload",
        token,
        {
            "sourceType": "TEXT",
            "title": "병동 간호사 (가상)",
            "content": (
                "병원: 한빛종합병원\n모집: 병동 간호사\n"
                "담당: 투약·간호기록·환자 안전, 감염관리 지침 준수, 다학제 협진\n"
                "자격: 간호사 면허, 병동 경력 우대\n"
                "우대: 감염관리·응급 대응 경험\n"
            ),
        },
        timeout=180,
    )
    job_rn_id = job_rn["id"]
    analysis_rn = api("GET", f"/api/v1/job-postings/{job_rn_id}/analysis", token)

    step("추천B (간호)")
    rec_rn = api(
        "POST",
        "/api/v1/rag/recommend-experiences",
        token,
        {"keywords": ["간호사", "투약", "병동", "감염관리", "환자안전"], "topK": 30, "minScore": 0.28},
        timeout=120,
    )
    rec_rn = rec_rn or []
    titles_rn = [r.get("title", "") for r in rec_rn]
    rn_hit = any(any(k in t for k in ("투약", "응급", "감염", "간호")) for t in titles_rn[:5])
    check("recommend_rn_relevant", rn_hit, f"top={titles_rn[:5]}")

    pick_rn = [r["id"] for r in rec_rn[:5]]
    if len(pick_rn) < 2:
        pick_rn = [c["id"] for c in created if "간호" in (c.get("role") or "")][:5]

    step("자소서 생성B (간호, 문항 3)")
    gen_rn = api(
        "POST",
        "/api/v1/ai/generate",
        token,
        {
            "keywords": ["간호사", "투약", "감염관리"],
            "rewriteLevel": 40,
            "jobPostingId": job_rn_id,
            "jobAnalysis": analysis_rn,
            "sectionTitles": ["성장과정", "직무역량", "지원동기"],
            "experienceIds": pick_rn,
        },
        timeout=600,
    )
    content_rn = (gen_rn or {}).get("content") or ""
    REPORT["gen_rn_len"] = len(content_rn)
    check("gen_rn_nonempty", len(content_rn) >= 200, f"chars={len(content_rn)}")
    check("gen_rn_no_domain_leak", not DOMAIN_LEAK.search(content_rn), "")
    # 개발 스택이 간호 자소서에 튀면 안 됨
    dev_leak = sum(1 for w in ("Spring Boot", "Webpack", "Airflow", "JWT 인증") if w in content_rn)
    check("gen_rn_no_dev_mix", dev_leak == 0, f"hits={dev_leak}")
    # 역할 날조: SI 개발자 표현 금지
    check("gen_rn_no_si_label", "SI" not in content_rn, "SI substring")
    check("gen_rn_mentions_nursing", any(w in content_rn for w in ("간호", "투약", "환자", "감염")), "nursing terms")

    # 추천 페이징 폭: topK 30에 실제로 6개 이상 나오는지 (경험 풀이 충분)
    check("recommend_width_fe", len(rec_fe) >= 6, f"n={len(rec_fe)}")

    elapsed = round(time.time() - t0, 1)
    REPORT["elapsed_sec"] = elapsed
    failed = [c for c in REPORT["checks"] if not c["ok"]]
    print("\n======== SUMMARY ========", flush=True)
    print(f"account: {EMAIL}", flush=True)
    print(f"elapsed: {elapsed}s  checks: {len(REPORT['checks']) - len(failed)}/{len(REPORT['checks'])} passed", flush=True)
    if failed:
        print("FAILED:", flush=True)
        for f in failed:
            print(f" - {f['name']}: {f['detail']}", flush=True)
    # 생성 본문 샘플 (앞 200자)
    print("\n[FE sample]", content_fe[:220].replace("\n", " "), flush=True)
    print("\n[RN sample]", content_rn[:220].replace("\n", " "), flush=True)
    out_path = "/tmp/resume-pilot-e2e-multi-report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(REPORT, f, ensure_ascii=False, indent=2)
    print(f"\nreport: {out_path}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        REPORT["error"] = str(e)
        with open("/tmp/resume-pilot-e2e-multi-report.json", "w", encoding="utf-8") as f:
            json.dump(REPORT, f, ensure_ascii=False, indent=2)
        sys.exit(2)
