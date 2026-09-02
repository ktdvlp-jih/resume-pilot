#!/usr/bin/env python3
"""데모 테스트 계정·경험 3건·공통 공고 3건을 로컬 API에 넣습니다. 운영 계정에는 쓰지 마세요."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("RESUME_API_URL", "http://localhost:8080").rstrip("/")
PASSWORD = os.environ.get("DEMO_SEED_PASSWORD", "password123")
CLOSES_AT = "2026-09-30T14:59:59.000Z"

ACCOUNTS = [
    ("demo-backend@resumepilot.test", "데모 백엔드", "Backend"),
    ("demo-frontend@resumepilot.test", "데모 프론트엔드", "Frontend"),
    ("demo-pm@resumepilot.test", "데모 기획", "PM"),
    ("demo-data@resumepilot.test", "데모 데이터", "Data"),
    ("demo-design@resumepilot.test", "데모 디자인", "Design"),
]

EXPERIENCES = {
    "Backend": [
        {
            "type": "PROJECT",
            "title": "교내 서비스 공통 API 모듈",
            "description": "여러 팀이 같은 인증·조회를 반복 구현하지 않도록, 수업 프로젝트에서 공통 API 모듈을 만들고 기존 화면 두 개를 그 모듈 위로 옮겼다. 한 화면 기능 수정이 아니라 공통 경계와 이전 순서를 정한 일이다.",
            "role": "백엔드 개발",
            "contribution": "인터페이스 초안, 이전 순서, 호출부 수정 안내를 맡았다.",
            "result": "두 화면이 같은 인증 모듈을 쓰게 바뀌었고, 중복 구현을 더 늘리지 않기로 합의했다.",
            "starSituation": "팀마다 로그인 검증이 달라 오류가 화면마다 달랐다.",
            "starTask": "공통으로 쓸 인증 경계를 정하고 기존 화면을 옮긴다.",
            "starAction": "최소 인터페이스만 남기고, 한 화면씩 바꿔 회귀를 확인했다.",
            "starResult": "두 화면이 같은 모듈을 쓰게 되었고 중복 구현은 멈췄다.",
            "skills": ["Java", "Spring"],
            "startDate": "2024-03-01",
            "endDate": "2024-12-01",
        },
        {
            "type": "TECHNOLOGY",
            "title": "목록 API 지연 원인 측정",
            "description": "목록이 늦게 나와 설정만 바꾸지 않고, 호출 구간을 나눠 어디서 시간이 쓰이는지 측정한 뒤 후보 캐시를 이번엔 넣지 않기로 했다. 공고에 적힌 도구는 이 측정에 쓰지 않았다.",
            "role": "백엔드 개발",
            "contribution": "측정 구간 나누기와 도입하지 않기로 한 근거 정리를 맡았다.",
            "result": "지연 구간을 조회 쿼리로 좁혔고, 캐시는 이번 범위에서 빼기로 했다.",
            "starSituation": "목록 첫 응답이 느려 사용자 대기 시간이 늘었다.",
            "starTask": "원인을 계층별로 가리고 이번 범위에서 고칠 것을 고른다.",
            "starAction": "구간별 시간을 잰 뒤 캐시 후보는 복잡도 대비 이득이 적어 보류했다.",
            "starResult": "원인은 조회 쪽에 있었고 캐시는 넣지 않았다.",
            "skills": ["Java"],
            "startDate": "2024-06-01",
            "endDate": "2024-08-01",
        },
        {
            "type": "PROBLEM_SOLVING",
            "title": "동시 요청으로 재고가 어긋난 문제",
            "description": "같은 재고를 두 요청이 동시에 깎아 숫자가 어긋났다. 락 범위를 재고 한 줄로 좁히고, 같은 증상이 다시 안 나게 로그 가드를 남겼다. 결제 도메인은 이 일에 없다.",
            "role": "백엔드 개발",
            "contribution": "재현, 락 범위 축소, 재발 확인을 맡았다.",
            "result": "같은 조건으로 다시 넣어도 재고가 두 번 깎이지 않았다.",
            "starSituation": "재고 수가 요청 수와 맞지 않는 건이 나왔다.",
            "starTask": "동시 차감에서도 한 번만 줄도록 맞춘다.",
            "starAction": "락을 재고 행으로 좁히고 중복 차감 로그를 남겼다.",
            "starResult": "재현 스크립트에서 이중 차감이 사라졌다.",
            "skills": ["Java", "SQL"],
            "startDate": "2024-09-01",
            "endDate": "2024-11-01",
        },
    ],
    "Frontend": [
        {
            "type": "PROJECT",
            "title": "검색 결과 빈 상태 화면",
            "description": "검색 결과가 없을 때 흰 화면만 나와 사용자가 다음 행동을 몰랐다. 빈 상태 문구와 다시 검색 입력을 같은 화면에 두고, 결과가 있을 때와 없을 때 레이아웃이 밀리지 않게 맞췄다.",
            "role": "프론트엔드 개발",
            "contribution": "빈 상태 카피, 레이아웃, API 없음 응답 처리를 맡았다.",
            "result": "결과 없음에서도 다음 검색을 같은 화면에서 할 수 있게 되었다.",
            "starSituation": "검색 0건이면 화면이 비어 이탈이 늘었다.",
            "starTask": "결과 없음에서도 다음 행동을 고를 수 있게 한다.",
            "starAction": "빈 상태와 입력창을 한 화면에 두고 높이 변화를 줄였다.",
            "starResult": "빈 결과에서도 재검색이 같은 페이지에서 가능해졌다.",
            "skills": ["TypeScript", "React"],
            "startDate": "2024-02-01",
            "endDate": "2024-07-01",
        },
        {
            "type": "TECHNOLOGY",
            "title": "첫 화면 렌더 방식 비교",
            "description": "검색 첫 화면이 느려 익숙한 서버 렌더와 클라이언트 렌더를 같은 목록으로 비교한 뒤, 이번엔 서버 렌더를 쓰지 않기로 했다. 측정은 이 화면에서만 했고 공고 스택을 복사하지 않았다.",
            "role": "프론트엔드 개발",
            "contribution": "측정 시나리오와 이번 범위에서 빼기로 한 근거를 정리했다.",
            "result": "이번 화면은 클라이언트 렌더를 유지하고 서버 렌더는 보류했다.",
            "starSituation": "검색 첫 페인트가 늦어 목록이 늦게 보였다.",
            "starTask": "렌더 방식 후보를 같은 조건으로 비교한다.",
            "starAction": "두 방식을 같은 목록으로 재보고 서버 렌더 이득이 적어 보류했다.",
            "starResult": "이번 범위에서는 기존 렌더를 유지했다.",
            "skills": ["TypeScript"],
            "startDate": "2024-05-01",
            "endDate": "2024-06-01",
        },
        {
            "type": "COLLABORATION",
            "title": "시안과 API 필드 맞추기",
            "description": "디자인 시안의 필드 이름과 서버 응답이 달라 빈 값이 화면에 그대로 나왔다. 기획·서버와 필드 표를 맞춰 빈 상태를 먼저 그린 뒤, 있는 필드만 연결했다.",
            "role": "프론트엔드 개발",
            "contribution": "필드 표 초안과 빈 상태 화면을 먼저 올렸다.",
            "result": "없는 필드를 기다리지 않고 있는 값만 그리기로 합의했다.",
            "starSituation": "시안 항목과 API 키가 어긋나 빈 칸이 보였다.",
            "starTask": "화면과 서버가 같은 필드 이름을 쓰게 한다.",
            "starAction": "표로 차이를 적고 빈 상태를 먼저 합의했다.",
            "starResult": "연결 가능한 필드만 올라가고 빈 칸 처리는 공통이 되었다.",
            "skills": [],
            "startDate": "2024-08-01",
            "endDate": "2024-10-01",
        },
    ],
    "PM": [
        {
            "type": "LEADERSHIP",
            "title": "요청 세 개 중 출시 범위 합의",
            "description": "신규 기능을 세 개 요청받았으나 목표 지표에 안 맞는 두 개를 접고, 남은 하나를 이번 출시 범위로 합의했다. 안 만들기로 한 이유도 기록했다.",
            "role": "기획",
            "contribution": "지표와 요청을 대조해 제외 안건과 출시 하나를 제안했다.",
            "result": "이번 주기에 기능 하나만 나가기로 팀과 합의했다.",
            "starSituation": "세 요청이 동시에 들어와 공수가 넘쳤다.",
            "starTask": "이번 주기 목표 지표에 맞는 하나만 남긴다.",
            "starAction": "지표에 안 맞는 두 개를 접는 이유를 적고 합의를 받았다.",
            "starResult": "출시 범위가 하나로 줄었다.",
            "skills": [],
            "startDate": "2024-01-01",
            "endDate": "2024-04-01",
        },
        {
            "type": "COLLABORATION",
            "title": "알림 스펙을 개발 주기에서 빼기",
            "description": "디자인 일정과 개발 공수가 충돌해, 이번 개발 주기에서 알림을 빼기로 했다. 빠진 알림은 다음 주기 백로그에만 남겼다.",
            "role": "기획",
            "contribution": "공수와 일정 충돌을 표로 정리하고 제외를 제안했다.",
            "result": "이번 주기 알림은 빠지고 핵심 흐름만 나갔다.",
            "starSituation": "알림 시안과 서버 일정이 겹쳐 둘 다 늦어질 상황이었다.",
            "starTask": "이번 주기에 넣을 것과 빼을 것을 나눈다.",
            "starAction": "알림을 다음으로 미루고 핵심 흐름만 남기는 안으로 모았다.",
            "starResult": "핵심 흐름은 일정 안에 나갔고 알림은 백로그로 갔다.",
            "skills": [],
            "startDate": "2024-05-01",
            "endDate": "2024-07-01",
        },
        {
            "type": "CONFLICT_RESOLUTION",
            "title": "웹과 설치본 기능 나누기",
            "description": "웹에서 쓰던 실시간 연동을 설치본에 그대로 넣으면 배포가 막혔다. 웹은 연동을 남기고 설치본은 배치 동기화로 나눠 제약을 맞췄다.",
            "role": "기획",
            "contribution": "제약과 기능을 표로 나눠 양쪽 범위를 합의했다.",
            "result": "웹과 설치본이 다른 동기화 방식을 쓰기로 스펙이 갈렸다.",
            "starSituation": "한 스펙을 두 배포에 복사하자 설치본 배포가 멈췄다.",
            "starTask": "배포 환경별로 넣을 기능을 나눈다.",
            "starAction": "실시간은 웹만, 설치본은 배치로 적고 합의를 받았다.",
            "starResult": "설치본 배포가 다시 진행되었고 웹 연동은 유지했다.",
            "skills": [],
            "startDate": "2024-09-01",
            "endDate": "2024-12-01",
        },
    ],
    "Data": [
        {
            "type": "PROJECT",
            "title": "일 배치 학습셋이 다시 나오게",
            "description": "어제와 같은 학습 데이터를 다시 뽑을 수 없어 실험이 재현되지 않았다. 스냅샷 날짜를 고정해 같은 셋이 다시 나오게 적재 순서를 바꿨다. 없는 정확도 숫자는 넣지 않았다.",
            "role": "데이터 엔지니어",
            "contribution": "스냅샷 기준과 적재 순서 변경을 맡았다.",
            "result": "같은 날짜를 지정하면 같은 행 수가 다시 나왔다.",
            "starSituation": "실험마다 학습 행 수가 달라 비교가 안 됐다.",
            "starTask": "같은 날짜의 셋이 다시 나오게 한다.",
            "starAction": "적재 키를 날짜로 고정하고 전날 셋을 덮지 않게 바꿨다.",
            "starResult": "지정 날짜로 다시 뽑으면 행 수가 같았다.",
            "skills": ["SQL", "Python"],
            "startDate": "2024-03-01",
            "endDate": "2024-09-01",
        },
        {
            "type": "PROBLEM_SOLVING",
            "title": "이탈로 보이던 지표를 가입 오류로 다시 쓰기",
            "description": "이탈로 보이던 숫자를 뜯어보니 가입 중 오류가 섞여 있었다. 문제를 가입 오류로 다시 쓰고, 가입 화면 문구를 바꾸는 쪽으로 스쿼드가 합의했다.",
            "role": "데이터 분석",
            "contribution": "구간을 나눠 오류와 진짜 이탈을 가렸다.",
            "result": "과제가 이탈 캠페인이 아니라 가입 문구 수정으로 바뀌었다.",
            "starSituation": "이탈률이 올라 캠페인 요청이 들어왔다.",
            "starTask": "무엇이 이탈인지부터 다시 정한다.",
            "starAction": "가입 실패와 이탈을 나눠 보고 문구 수정안을 제안했다.",
            "starResult": "캠페인 대신 가입 화면을 고치는 일로 합의됐다.",
            "skills": ["SQL"],
            "startDate": "2024-06-01",
            "endDate": "2024-08-01",
        },
        {
            "type": "ACHIEVEMENT",
            "title": "주 1회 코호트 실험으로 첫 버튼 문구",
            "description": "추천 모델 대신 주 1회 코호트 실험으로 첫 구매 버튼 문구만 바꿨다. 리프트 숫자는 실험 로그에 없는 값은 적지 않았다.",
            "role": "데이터 분석",
            "contribution": "실험 설계와 주 단위 집계를 맡았다.",
            "result": "문구 A/B가 한 주 단위로 남고 모델 배포는 하지 않았다.",
            "starSituation": "모델 배포 요청이 있었으나 검증 데이터가 부족했다.",
            "starTask": "작은 카피로 먼저 방향을 본다.",
            "starAction": "주 1회 코호트로 문구만 바꾸고 모델은 보류했다.",
            "starResult": "실험 로그가 남았고 모델 배포는 하지 않았다.",
            "skills": ["Python"],
            "startDate": "2024-10-01",
            "endDate": "2024-12-01",
        },
    ],
    "Design": [
        {
            "type": "PROJECT",
            "title": "실패·미설정 상태까지 포함한 설정 흐름",
            "description": "설정이 비어 있거나 저장에 실패해도 다음 행동을 고를 수 있게, 실패·미설정 상태를 먼저 그렸다. 성공 경로만 있는 시안은 이번 범위에서 빼기로 했다.",
            "role": "제품 디자인",
            "contribution": "상태 목록과 실패 화면 초안을 올렸다.",
            "result": "미설정·실패에서도 다시 시도하거나 건너뛸 수 있게 되었다.",
            "starSituation": "성공 화면만 있어 실패 시 사용자가 멈췄다.",
            "starTask": "실패와 비어 있는 상태에서도 다음 행동을 고르게 한다.",
            "starAction": "상태 세 개를 나누고 각 화면의 다음 버튼을 정했다.",
            "starResult": "실패·미설정에서도 흐름이 끊기지 않았다.",
            "skills": ["Figma"],
            "startDate": "2024-02-01",
            "endDate": "2024-06-01",
        },
        {
            "type": "TECHNOLOGY",
            "title": "분석 결과 위계 나누기",
            "description": "분석 숫자가 한 화면에 모여 읽히지 않았다. 요약·상세·빈 상태를 위계로 나눈 뒤, 빈 상태 문구만 먼저 합의했다.",
            "role": "제품 디자인",
            "contribution": "위계 초안과 빈 상태 카피를 정리했다.",
            "result": "한 화면에 숫자를 몰아넣지 않기로 합의했다.",
            "starSituation": "결과 화면이 밀도만 높고 어디를 봐야 하는지 없었다.",
            "starTask": "읽히는 순서로 위계를 나눈다.",
            "starAction": "요약과 상세를 나누고 빈 상태를 먼저 합의했다.",
            "starResult": "첫 화면은 요약만 남고 상세는 다음 단계로 갔다.",
            "skills": ["Figma"],
            "startDate": "2024-07-01",
            "endDate": "2024-09-01",
        },
        {
            "type": "PROBLEM_SOLVING",
            "title": "검색 무결과 과제를 QA로 고정",
            "description": "검색 무결과 문의가 반복되어, 그 구간만 과제로 고르고 빈 상태·오타 제안 화면을 QA 목록에 넣었다. 없는 전환율은 성과에 적지 않았다.",
            "role": "제품 디자인",
            "contribution": "과제 선정 이유와 QA 항목을 적었다.",
            "result": "무결과 화면이 QA 통과 조건에 들어갔다.",
            "starSituation": "검색 무결과에서 문의가 반복됐다.",
            "starTask": "그 구간만 검증 가능한 과제로 고정한다.",
            "starAction": "빈 상태와 오타 제안을 QA 항목으로 올렸다.",
            "starResult": "해당 화면이 출시 전 체크 목록에 남았다.",
            "skills": [],
            "startDate": "2024-10-01",
            "endDate": "2024-12-01",
        },
    ],
}

# 토스·당근 등 실제 공고 원문은 docs/bot/corpus 에만 둔다. 앱에는 데모 공고만 넣는다.
JOBS = [
    {
        "email": "demo-backend@resumepilot.test",
        "title": "데모커머스 백엔드 개발자",
        "position": "Backend",
        "content": """회사: 데모커머스
직무: 백엔드 개발자
마감: 2026-09-30

담당 업무
- 주문·재고 조회 API를 만들고, 화면 팀이 같은 인증 모듈을 쓰도록 경계를 맞춘다.
- 목록 지연이 나면 구간을 나눠 측정한 뒤, 이번에 넣을 수정과 보류할 캐시를 구분한다.
- 동시 요청으로 숫자가 어긋나면 락 범위를 한 줄로 좁히고 재발을 확인한다.

자격
- Java 또는 동등한 언어로 API를 만든 경험
- SQL로 조회를 읽고 고친 경험

우대
- 수업·사이드 프로젝트에서 공통 모듈을 옮긴 경험
- 장애 로그를 남기고 같은 증상이 다시 안 나게 확인한 경험

지원 안내·개인정보 수집 문구는 이 데모 공고에 넣지 않는다.
""",
    },
    {
        "email": "demo-frontend@resumepilot.test",
        "title": "데모앱스 프론트엔드 개발자",
        "position": "Frontend",
        "content": """회사: 데모앱스
직무: 프론트엔드 개발자
마감: 2026-09-30

담당 업무
- 검색 결과가 없을 때 다음 행동을 고를 수 있게 빈 상태와 입력을 한 화면에 둔다.
- 시안 필드와 서버 응답이 다르면 있는 값만 그리고, 빈 상태를 먼저 합의한다.
- 첫 화면이 느리면 렌더 방식을 같은 목록으로 비교하고, 이번 범위에서 빼을 것을 정한다.

자격
- TypeScript 또는 JavaScript로 화면을 만든 경험
- API 응답이 비었을 때를 화면에 처리한 경험

우대
- 디자인·서버와 필드 이름을 표로 맞춘 경험
- 접근 가능한 빈 상태·오류 메시지를 쓴 경험

지원 안내·개인정보 수집 문구는 이 데모 공고에 넣지 않는다.
""",
    },
    {
        "email": "demo-pm@resumepilot.test",
        "title": "데모서비스 서비스 기획",
        "position": "PM",
        "content": """회사: 데모서비스
직무: 서비스 기획
마감: 2026-09-30

담당 업무
- 요청이 여러 개 들어오면 이번 주기 지표에 맞는 하나만 남기고, 빼는 이유를 적는다.
- 디자인 일정과 개발 공수가 겹치면 이번 범위에서 뺄 기능을 합의한다.
- 웹과 설치본처럼 배포가 다르면 기능을 나눠 스펙을 갈라 적는다.

자격
- 출시 범위를 문서나 표로 남긴 경험
- 이해관계자와 빼기로 한 항목을 합의한 경험

우대
- 지표와 요청을 대조해 과제를 다시 쓴 경험
- QA 목록에 실패·빈 상태를 넣은 경험

지원 안내·개인정보 수집 문구는 이 데모 공고에 넣지 않는다.
""",
    },
    {
        "email": "demo-data@resumepilot.test",
        "title": "데모데이터 데이터 분석·엔지니어",
        "position": "Data",
        "content": """회사: 데모데이터
직무: 데이터 분석·엔지니어
마감: 2026-09-30

담당 업무
- 어제와 같은 학습 셋이 다시 나오게 스냅샷 날짜를 고정하고 적재 순서를 맞춘다.
- 이탈로 보이던 숫자를 구간으로 나눠, 가입 오류와 진짜 이탈을 가린다.
- 모델 배포 대신 주 1회 코호트 실험으로 작은 카피만 검증한다.

자격
- SQL로 집계를 만들고 같은 조건을 다시 돌린 경험
- 실험이나 배치 결과가 다시 나오게 기준을 남긴 경험

우대
- 문제를 다시 써서 제품 과제가 바뀐 경험
- Python으로 집계 스크립트를 돌린 경험

지원 안내·개인정보 수집 문구는 이 데모 공고에 넣지 않는다.
""",
    },
    {
        "email": "demo-design@resumepilot.test",
        "title": "데모디자인 제품 디자이너",
        "position": "Design",
        "content": """회사: 데모디자인
직무: 제품 디자이너
마감: 2026-09-30

담당 업무
- 설정이 비어 있거나 저장에 실패해도 다음 행동을 고를 수 있게 상태를 먼저 그린다.
- 숫자가 한 화면에 모이면 요약·상세·빈 상태로 위계를 나눈다.
- 검색 무결과처럼 반복되는 구간만 과제로 고르고 QA 목록에 넣는다.

자격
- 성공 경로만이 아니라 실패·빈 상태를 시안에 넣은 경험
- 화면 위계와 다음 버튼을 합의한 경험

우대
- 빈 상태 문구를 먼저 합의한 경험
- 출시 전 체크 목록에 무결과 화면을 넣은 경험

지원 안내·개인정보 수집 문구는 이 데모 공고에 넣지 않는다.
""",
    },
]


def request(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 180):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"error": {"message": raw}}
        parsed["_status"] = exc.code
        return parsed


def token_of(payload: dict) -> str | None:
    data = payload.get("data") or {}
    return data.get("accessToken")


def ensure_account(email: str, name: str) -> str:
    signed = request("POST", "/api/v1/auth/signup", body={"email": email, "password": PASSWORD, "name": name, "termsAccepted": True, "privacyAccepted": True})
    token = token_of(signed)
    if token:
        print(f"signup {email}")
        return token
    logged = request("POST", "/api/v1/auth/login", body={"email": email, "password": PASSWORD})
    token = token_of(logged)
    if not token:
        err = (logged.get("error") or {}).get("code") or logged.get("_status")
        raise SystemExit(f"login failed for {email}: {err}")
    print(f"login {email}")
    return token


def ensure_experiences(token: str, role: str) -> None:
    listed = request("GET", "/api/v1/experiences", token=token)
    existing = {row.get("title") for row in (listed.get("data") or [])}
    for item in EXPERIENCES[role]:
        if item["title"] in existing:
            print(f"  skip experience {item['title']}")
            continue
        created = request("POST", "/api/v1/experiences", token=token, body=item)
        if created.get("success"):
            print(f"  experience {item['title']}")
        else:
            raise SystemExit(f"experience failed {item['title']}: {created}")


def ensure_jobs() -> None:
    tokens = {}
    for email, name, role in ACCOUNTS:
        tokens[email] = ensure_account(email, name)
        ensure_experiences(tokens[email], role)

    for job in JOBS:
        token = tokens[job["email"]]
        listed = request("GET", "/api/v1/job-postings", token=token)
        rows = listed.get("data") or []
        found = next(
            (row for row in rows if row.get("title") == job["title"] and row.get("owned")),
            None,
        )
        if found:
            posting_id = found["id"]
            print(f"skip job {job['title']}")
        else:
            uploaded = request(
                "POST",
                "/api/v1/job-postings/upload",
                token=token,
                body={
                    "sourceType": "TEXT",
                    "title": job["title"],
                    "position": job["position"],
                    "content": job["content"],
                    "closesAt": CLOSES_AT,
                },
            )
            posting_id = (uploaded.get("data") or {}).get("id")
            if not posting_id:
                err = (uploaded.get("error") or {}).get("code") or uploaded.get("_status")
                raise SystemExit(f"job upload failed {job['title']}: {err}")
            print(f"job {job['title']}")
        request("PATCH", f"/api/v1/job-postings/{posting_id}/share", token=token, body={"shared": True})
        request(
            "PATCH",
            f"/api/v1/job-postings/{posting_id}/closes-at",
            token=token,
            body={"closesAt": CLOSES_AT},
        )
        print(f"  shared+deadline {job['title']}")


def main() -> None:
    try:
        health = request("GET", "/actuator/health", timeout=5)
    except urllib.error.URLError as exc:
        raise SystemExit(f"API 연결 실패 ({API}): {exc}") from exc
    if health.get("_status"):
        raise SystemExit(f"API health failed ({API})")
    if health.get("status") not in (None, "UP"):
        # wrapped or raw actuator
        pass
    try:
        ensure_jobs()
    except urllib.error.URLError as exc:
        raise SystemExit(f"API 연결 실패 ({API}): {exc}") from exc
    print("done")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
