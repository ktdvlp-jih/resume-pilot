#!/usr/bin/env python3
"""E2E 다직군 계정: 경험 보강(ready) + 대시보드 포트폴리오 가상 데이터."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("E2E_API_BASE", "http://127.0.0.1:8080")
EMAIL = os.environ.get("E2E_EMAIL", "e2e-multi-1785425346@example.com")
PASSWORD = os.environ.get("E2E_PASSWORD")
if not PASSWORD:
    raise SystemExit("E2E_PASSWORD 환경변수를 설정하세요.")


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
        raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode()[:800]}") from e


def enrich(exp: dict) -> dict:
    """생성 준비됨 기준: desc>=80, role, result>=10 또는 STAR합>=40."""
    title = exp.get("title") or "경험"
    role = (exp.get("role") or "담당자").strip()
    base_desc = (exp.get("description") or "").strip()
    result = (exp.get("result") or "").strip()
    contribution = (exp.get("contribution") or "").strip()

    # 제목·역할 맥락으로 설명 확장 (가상)
    extra = (
        f" 본 과업에서 {role}로서 목표를 정의하고, 이해관계자와 일정·우선순위를 조율하며 "
        f"실행 계획을 구체화했다. 현장·시스템 제약을 파악한 뒤 단계적으로 개선안을 적용했고, "
        f"결과 지표와 피드백을 주기적으로 점검해 보완했다. ({title})"
    )
    description = (base_desc + extra).strip()
    if len(description) > 2000:
        description = description[:2000]
    if len(description) < 80:
        description = (description + " " + "구체적인 실행과 검증을 반복하며 목표 달성에 기여했다.")[:2000]

    if len(result) < 10:
        result = (result + " 목표 지표가 개선되었고 관련 이해관계자 피드백이 긍정적으로 정리되었다.").strip()
        if len(result) > 500:
            result = result[:500]

    star_s = (exp.get("starSituation") or "").strip() or f"{title} 착수 전 기존 방식의 비효율과 리스크가 있었다."
    star_t = (exp.get("starTask") or "").strip() or "문제를 정의하고 실행 가능한 개선안을 도출해야 했다."
    star_a = (exp.get("starAction") or "").strip() or (
        contribution or f"{role}로서 현황을 분석하고 실행안을 적용했다."
    )
    star_r = (exp.get("starResult") or "").strip() or result

    # STAR 필드 한도 800
    def clip(s: str, n: int = 800) -> str:
        return s[:n]

    patch = {
        "description": description,
        "role": role[:100],
        "result": result[:500],
        "contribution": (contribution or f"{title} 실행 및 성과 정리")[:1000],
        "starSituation": clip(star_s),
        "starTask": clip(star_t),
        "starAction": clip(star_a),
        "starResult": clip(star_r),
    }
    if exp.get("skills"):
        patch["skills"] = exp["skills"]
    if exp.get("startDate"):
        patch["startDate"] = exp["startDate"][:10] if isinstance(exp["startDate"], str) else exp["startDate"]
    if exp.get("endDate"):
        patch["endDate"] = exp["endDate"][:10] if isinstance(exp["endDate"], str) else exp["endDate"]
    return patch


def readiness(exp: dict) -> str:
    desc = (exp.get("description") or "").strip()
    result = (exp.get("result") or "").strip()
    star = "".join((exp.get(k) or "").strip() for k in ("starSituation", "starTask", "starAction", "starResult"))
    role = (exp.get("role") or "").strip()
    if not (exp.get("title") or "").strip():
        return "empty"
    if len(desc) >= 80 and (len(result) >= 10 or len(star) >= 40) and role:
        return "ready"
    if len(desc) >= 30 or len(result) >= 5:
        return "thin"
    return "empty"


PORTFOLIO = {
    "careers": [
        {
            "company": "북극성커머스",
            "position": "프론트엔드 / 프로덕트 협업",
            "startDate": "2021-03",
            "endDate": "2022-12",
            "description": "React·TypeScript 기반 커머스 UI 개선, 디자인시스템 협업, 성능 최적화 및 A/B 실험 지원.",
        },
        {
            "company": "한빛종합병원",
            "position": "병동 간호사",
            "startDate": "2018-03",
            "endDate": "2020-12",
            "description": "투약 안전·감염관리·다학제 협진. 체크리스트와 교육으로 환자 안전 지표 개선에 기여.",
        },
        {
            "company": "별무리에듀",
            "position": "중등 수학 / 담임",
            "startDate": "2017-03",
            "endDate": "2019-02",
            "description": "수준별 보충 수업 설계, 학급 자치 운영, 원격수업 전환 지원.",
        },
        {
            "company": "그린피크마케팅",
            "position": "퍼포먼스·콘텐츠 마케터",
            "startDate": "2021-01",
            "endDate": "2022-12",
            "description": "캠페인 A/B, 콘텐츠 캘린더, 인플루언서 협업으로 유입·CAC 개선.",
        },
    ],
    "educations": [
        {
            "school": "가상대학교",
            "major": "융합학부 (정보·사회)",
            "degree": "학사",
            "startDate": "2013-03",
            "endDate": "2017-02",
            "description": "프로그래밍 기초와 조직·서비스 운영을 함께 학습. 팀 프로젝트 다수 수행.",
        }
    ],
    "certifications": [
        {"text": "정보처리기사 (가상)"},
        {"text": "간호사 면허 (가상)"},
        {"text": "구글 애널리틱스 개인인증 (가상)"},
    ],
    "skills": [
        {"name": "React", "level": "advanced", "category": "Frontend"},
        {"name": "TypeScript", "level": "advanced", "category": "Frontend"},
        {"name": "Java/Spring", "level": "intermediate", "category": "Backend"},
        {"name": "SQL", "level": "intermediate", "category": "Data"},
        {"name": "환자안전/감염관리", "level": "advanced", "category": "Healthcare"},
        {"name": "퍼포먼스 광고", "level": "intermediate", "category": "Marketing"},
        {"name": "Figma", "level": "intermediate", "category": "Design"},
        {"name": "Jira/Roadmap", "level": "intermediate", "category": "PM"},
    ],
    "careerStatement": (
        "E2E다직군테스터는 서비스·현장·교육을 아우르는 가상 멀티커리어 프로필입니다. "
        "초기에는 교육·의료 현장에서 사람 중심 운영과 안전 프로세스를 익혔고, "
        "이후 커머스·마케팅·데이터·개발 협업으로 디지털 제품 경험을 쌓았습니다. "
        "공통적으로 문제를 수치·프로세스로 정의하고, 이해관계자와 합의해 개선을 실행하는 방식을 유지합니다. "
        "본 계정 데이터는 제품 검증용 가상 데이터이며 실제 인물·기관과 무관합니다."
    ),
    "coverLetter": {
        "jobExperience": (
            "프론트엔드·백엔드·데이터·마케팅 프로젝트를 통해 요구사항을 화면·API·지표로 연결해 본 경험이 있습니다. "
            "의료·교육 현장에서는 체크리스트와 교육으로 반복 오류를 줄이는 운영 역량을 쌓았습니다."
        ),
        "collaboration": (
            "디자인·개발·영업·임상·교사 등 역할이 다른 이해관계자와 일정·우선순위를 맞추며 "
            "문서·브리핑·루브릭으로 합의를 만드는 협업을 반복했습니다."
        ),
        "growthValues": (
            "현장 문제를 관찰한 뒤 작은 실험으로 검증하고, 결과를 다음 기준에 반영하는 성장 방식을 선호. "
            "직군이 달라도 ‘안전·신뢰·측정 가능한 개선’을 가치로 둡니다."
        ),
        "personality": (
            "장점은 맥락을 빠르게 정리하고 실행 단위로 쪼개는 점입니다. "
            "단점은 초기에 범위를 넓게 잡는 경향이 있어, MVP와 체크리스트로 스스로 제한합니다."
        ),
        "motivation": (
            "다양한 직군 데이터가 한 제품에서 어떻게 추천·생성되는지 검증하기 위해 가상 지원자로 구성했습니다. "
            "실제 지원 시나리오에서는 공고 요구와 맞는 경험만 선택해 설득력 있는 자소서를 만드는 것을 목표로 합니다."
        ),
    },
}


def main() -> int:
    tokens = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD})
    token = tokens["accessToken"]
    print("logged in", EMAIL)

    api(
        "PATCH",
        "/api/v1/users/me",
        token,
        {
            "name": "E2E다직군테스터",
            "bio": "제품 검증용 가상 멀티커리어 계정 (개발·의료·교육·마케팅 등).",
            "careerPortfolio": PORTFOLIO,
        },
    )
    print("portfolio updated")

    exps = api("GET", "/api/v1/experiences", token) or []
    print(f"experiences={len(exps)}")
    ready_before = sum(1 for e in exps if readiness(e) == "ready")
    print(f"ready_before={ready_before}")

    for i, exp in enumerate(exps, 1):
        patch = enrich(exp)
        updated = api("PATCH", f"/api/v1/experiences/{exp['id']}", token, patch)
        r = readiness(updated)
        if r != "ready":
            # 한 번 더 강제 확장
            patch["description"] = (patch["description"] + " 추가 검증과 회고를 문서화하여 재현 가능한 개선으로 남겼다.")[:2000]
            patch["result"] = (patch["result"] + " 성과가 정량·정성으로 확인되었다.")[:500]
            updated = api("PATCH", f"/api/v1/experiences/{exp['id']}", token, patch)
            r = readiness(updated)
        if i % 10 == 0:
            print(f"  … {i}/{len(exps)}")

    exps2 = api("GET", "/api/v1/experiences", token) or []
    ready = sum(1 for e in exps2 if readiness(e) == "ready")
    thin = sum(1 for e in exps2 if readiness(e) == "thin")
    print(f"ready_after={ready} thin={thin} total={len(exps2)}")

    emb = api("POST", "/api/v1/experiences/embed-all", token, timeout=300)
    print("embed", emb)

    me = api("GET", "/api/v1/users/me", token)
    cp = me.get("careerPortfolio") or {}
    print(
        "portfolio_fields",
        len(cp.get("careers") or []),
        len(cp.get("educations") or []),
        len(cp.get("skills") or []),
        bool((cp.get("careerStatement") or "").strip()),
    )
    return 0 if ready == len(exps2) and ready > 0 else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("ERROR", e, file=sys.stderr)
        sys.exit(2)
