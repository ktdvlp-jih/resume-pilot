#!/usr/bin/env python3
"""E2E 계정 경험 30건을 직군별·고유 문구로 재보강 (공통 템플릿 문구 제거)."""

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

# title substring → 고유 보강 페이로드 (ready 기준 충족, 공통 템플릿 문장 금지)
BY_TITLE: dict[str, dict] = {
    "쇼핑몰 프론트엔드": {
        "description": (
            "레거시 jQuery 기반 상품·장바구니·결제 UI를 React와 TypeScript로 전환했다. "
            "공통 컴포넌트와 디자인 토큰을 정리하고 코드 스플리팅으로 초기 로딩을 줄였다. "
            "결제 퍼널 병목을 측정해 불필요 리렌더를 제거했다."
        ),
        "role": "프론트엔드 개발자",
        "contribution": "디자인시스템 컴포넌트화와 LCP 개선 작업 주도",
        "result": "주요 상품 목록 LCP가 개선되고 결제 단계 이탈이 줄었다",
        "starSituation": "커머스 프론트가 jQuery로 유지되어 기능 추가와 성능 개선이 어려웠다",
        "starTask": "핵심 퍼널을 React로 이전하고 초기 로딩을 줄여야 했다",
        "starAction": "공통 UI를 모듈화하고 번들 분석 후 지연 로딩을 적용했다",
        "starResult": "전환율이 상승하고 프론트 배포 주기가 짧아졌다",
        "skills": ["React", "TypeScript", "Webpack"],
    },
    "백엔드 API 게이트웨이": {
        "description": (
            "서비스별 인증이 제각각이어서 장애와 보안 구멍이 반복되었다. "
            "Spring Boot 기반 API 게이트웨이에 JWT 검증과 rate limit을 모아 "
            "공통 라우팅·로깅을 표준화했다."
        ),
        "role": "백엔드 개발자",
        "contribution": "게이트웨이 인증·제한 정책 설계 및 적용",
        "result": "인증 관련 장애 티켓이 감소하고 서비스 접근 경로가 단일화되었다",
        "starSituation": "마이크로서비스마다 토큰 검증 방식이 달랐다",
        "starTask": "공통 진입점에서 인증과 트래픽 제한을 강제해야 했다",
        "starAction": "Gateway 필터로 JWT·쿼터를 구현하고 기존 서비스를 이전했다",
        "starResult": "인증 오류가 줄고 운영 모니터링이 단순해졌다",
        "skills": ["Java", "Spring Boot", "Redis"],
    },
    "푸시 알림": {
        "description": (
            "캠페인 푸시 실패가 잦아 도달률이 낮았다. FCM 발송 경로에 "
            "실패 재시도 큐와 디바이스 토큰 정리를 넣어 대량 발송도 안정적으로 "
            "처리되게 했고, 실패 원인을 대시보드에서 확인하도록 했다."
        ),
        "role": "모바일 개발자",
        "contribution": "재시도 큐와 실패 알림 대시보드 구성",
        "result": "푸시 도달률이 향상되고 실패율이 눈에 띄게 줄었다",
        "starSituation": "대량 발송 시 타임아웃과 토큰 만료로 실패가 누적되었다",
        "starTask": "실패를 재시도하고 무효 토큰을 정리해야 했다",
        "starAction": "큐 기반 재시도와 토큰 만료 배치를 구현했다",
        "starResult": "캠페인 도달 지표가 안정적으로 올랐다",
        "skills": ["Kotlin", "FCM"],
    },
    "CI/CD": {
        "description": (
            "수동 배포로 스테이징·프로덕션 혼선과 롤백 실수가 잦았다. "
            "GitHub Actions로 빌드·테스트·환경별 배포를 자동화하고 "
            "실패 시 이전 이미지로 롤백하는 절차를 문서화했다."
        ),
        "role": "DevOps 엔지니어",
        "contribution": "파이프라인 설계와 롤백 런북 작성",
        "result": "배포 시간이 약 40분에서 8분으로 줄고 배포 실수가 감소했다",
        "numericResult": "배포 40분→8분",
        "starSituation": "배포마다 수동 SSH와 체크리스트에 의존했다",
        "starTask": "환경을 분리한 자동 배포가 필요했다",
        "starAction": "워크플로와 Docker 이미지 태깅 규칙을 정의했다",
        "starResult": "배포 빈도가 늘고 롤백이 예측 가능해졌다",
        "skills": ["Docker", "GitHub Actions"],
    },
    "데이터 파이프라인": {
        "description": (
            "매출 집계를 엑셀로 맞추다 오차와 지연이 반복되었다. "
            "Python ETL과 Airflow DAG로 일별 집계를 스케줄링하고 "
            "검산용 SQL을 함께 남겨 리포트가 아침에 준비되게 했다."
        ),
        "role": "데이터 엔지니어",
        "contribution": "ETL 스크립트와 DAG 스케줄 운영",
        "result": "매일 아침 자동 리포트가 제공되어 수작업 집계가 사라졌다",
        "starSituation": "야간 수작업 집계로 오차가 발생했다",
        "starTask": "일별 집계를 자동·재현 가능하게 만들어야 했다",
        "starAction": "추출·변환·적재 단계를 DAG로 분리했다",
        "starResult": "리포트 신뢰도와 전달 시각이 안정화되었다",
        "skills": ["Python", "Airflow", "PostgreSQL"],
    },
    "투약 체크리스트": {
        "description": (
            "야간 투약 누락과 이중 투약 우려가 있었다. 병동 간호사로서 "
            "투약 전·중·후 더블체크 체크리스트와 인수인계 양식을 만들어 "
            "교대 시에도 누락이 드러나도록 했다."
        ),
        "role": "간호사",
        "contribution": "투약 더블체크 체크리스트 도입과 인수인계 양식 정리",
        "result": "투약 누락·오류 관련 보고 건수가 감소했다",
        "starSituation": "야간 교대에서 투약 확인이 구두에만 의존했다",
        "starTask": "표준화된 확인 절차가 필요했다",
        "starAction": "체크리스트를 시범 적용하고 피드백으로 항목을 조정했다",
        "starResult": "투약 안전 지표가 개선되고 인수인계가 명확해졌다",
        "skills": ["환자안전", "투약관리"],
    },
    "응급 환자": {
        "description": (
            "응급실에서 중증 환자 정보가 구두로만 전달되어 지연이 생겼다. "
            "응급실 간호사로서 의사·방사선과와 공유하는 타임라인 보드와 "
            "짧은 브리핑 루틴을 정착시켰다."
        ),
        "role": "응급실 간호사",
        "contribution": "다학제 타임라인 공유와 브리핑 루틴 운영",
        "result": "초기 대응이 빨라져 골든타임 확보에 도움이 되었다",
        "starSituation": "인수인계 누락으로 검사가 지연되는 사례가 있었다",
        "starTask": "역할별 정보 공유 체계가 필요했다",
        "starAction": "화이트보드 타임라인과 브리핑 순서를 합의했다",
        "starResult": "협진 응답 시간이 줄고 누락이 감소했다",
        "skills": ["응급간호", "협진"],
    },
    "감염관리 교육": {
        "description": (
            "손위생·격리 지침 숙지 편차가 커 감염 위험이 있었다. "
            "병동 간호사로서 월 1회 감염관리 교육을 진행하고 "
            "신규 직원 오리엔테이션에 손위생 실습을 넣었다."
        ),
        "role": "병동 간호사",
        "contribution": "감염관리 교육 진행과 오리엔테이션 실습 포함",
        "result": "손위생 준수율이 상승하고 감염 관련 지표가 개선되었다",
        "starSituation": "지침은 있으나 현장 적용이 들쭉날쭉했다",
        "starTask": "교육과 현장 점검으로 준수율을 올려야 했다",
        "starAction": "월간 교육과 관찰 피드백을 반복했다",
        "starResult": "준수율과 감염 지표가 함께 좋아졌다",
        "skills": ["감염관리", "환자교육"],
    },
    "수학 보충": {
        "description": (
            "학습 격차가 큰 학급에서 일괄 진도만으로는 하위권이 따라오지 못했다. "
            "수학 교사로서 진단평가 후 수준별 문제 세트를 만들고 "
            "주 2회 보충으로 취약 단원을 반복했다."
        ),
        "role": "수학 교사",
        "contribution": "진단·수준별 문제은행과 보충 수업 운영",
        "result": "하위권 평균 점수가 상승하고 수업 참여가 늘었다",
        "starSituation": "동일 진도로 격차가 커졌다",
        "starTask": "수준에 맞는 과제가 필요했다",
        "starAction": "문제은행을 난이도별로 분류해 배정했다",
        "starResult": "평가 결과가 고르게 개선되었다",
        "skills": ["교육과정", "수준별학습"],
    },
    "학급 자치회": {
        "description": (
            "학급 규칙이 형식적이라 갈등과 민원이 반복되었다. "
            "담임으로서 주간 자치 회의를 열고 학생이 규칙을 제안·투표하게 해 "
            "합의된 약속만 게시판에 올렸다."
        ),
        "role": "담임 교사",
        "contribution": "학급 자치 회의와 규칙 합의 프로세스 운영",
        "result": "규칙 미준수와 학부모 민원이 줄었다",
        "starSituation": "규칙이 교사 일방으로 느껴져 저항이 있었다",
        "starTask": "학생이 소유감을 갖는 규칙이 필요했다",
        "starAction": "주간 회의와 투표로 규칙을 갱신했다",
        "starResult": "갈등 빈도가 줄고 자치 참여가 늘었다",
        "skills": ["생활지도", "자치활동"],
    },
    "온라인 수업": {
        "description": (
            "원격수업 전환 직후 출석과 접속 편차가 컸다. "
            "교사로서 화상 도구 가이드와 녹화본·학부모 안내문을 배포하고 "
            "출석 체크 방식을 단순화했다."
        ),
        "role": "교사",
        "contribution": "원격수업 도구 가이드와 출석 절차 정리",
        "result": "출석률이 안정되고 학부모 문의가 줄었다",
        "starSituation": "도구 미숙으로 결석이 늘었다",
        "starTask": "접속·출석을 쉽게 만들어야 했다",
        "starAction": "단계별 가이드와 녹화본을 제공했다",
        "starResult": "출석이 회복되고 수업이 이어졌다",
        "skills": ["Zoom", "원격수업"],
    },
    "신제품 런칭 캠페인": {
        "description": (
            "전환 비용이 올라가 채널 효율이 나빴다. 퍼포먼스 마케터로서 "
            "검색·SNS 소재를 A/B로 돌리고 예산 비중을 주간 단위로 재배분했다."
        ),
        "role": "퍼포먼스 마케터",
        "contribution": "크리에이티브 실험과 채널 예산 재배분",
        "result": "CAC가 약 18% 감소하며 목표 CPA에 도달했다",
        "numericResult": "CAC 18% 감소",
        "starSituation": "광고비 대비 전환이 떨어졌다",
        "starTask": "효율 좋은 소재·채널을 찾아야 했다",
        "starAction": "소재 실험과 입찰 조정을 병행했다",
        "starResult": "CAC가 개선되고 런칭 KPI를 맞췄다",
        "skills": ["Meta Ads", "GA4"],
    },
    "브랜드 콘텐츠 캘린더": {
        "description": (
            "콘텐츠 발행이 들쭉날쭉해 오가닉 유입이 불안정했다. "
            "콘텐츠 마케터로서 SEO 키워드를 매핑한 월간 캘린더를 운영하고 "
            "주제 파이프라인을 Notion으로 관리했다."
        ),
        "role": "콘텐츠 마케터",
        "contribution": "월간 콘텐츠 캘린더와 SEO 주제 파이프라인",
        "result": "오가닉 유입이 증가하고 발행 일정이 지켜졌다",
        "starSituation": "발행 주기가 불규칙했다",
        "starTask": "예측 가능한 콘텐츠 운영이 필요했다",
        "starAction": "키워드 맵과 캘린더를 합의해 발행했다",
        "starResult": "유입과 발행 안정성이 함께 올랐다",
        "skills": ["SEO", "Notion"],
    },
    "인플루언서 협업": {
        "description": (
            "협업 메시지가 제각각이라 브랜드 일관성이 깨졌다. "
            "마케팅 담당으로서 계약·가이드라인·검수 체크리스트를 만들어 "
            "리뷰·언박싱 콘텐츠를 사전 검수했다."
        ),
        "role": "마케팅 담당",
        "contribution": "인플루언서 가이드와 검수 프로세스 정립",
        "result": "도달은 늘리면서 부정·오안내 이슈를 막았다",
        "starSituation": "크리에이터마다 메시지 편차가 컸다",
        "starTask": "브랜드 메시지를 지키면서 협업해야 했다",
        "starAction": "가이드 배포와 업로드 전 검수를 의무화했다",
        "starResult": "이슈 없이 캠페인 도달이 확대되었다",
        "skills": ["인플루언서", "브랜드가이드"],
    },
    "월결산 자동화": {
        "description": (
            "월결산마다 계정과목 대조에 야근이 반복되었다. "
            "회계 담당으로서 매핑 매크로와 전표 검증 규칙을 만들어 "
            "반복 항목을 자동 대조하게 했다."
        ),
        "role": "회계 담당",
        "contribution": "결산 스프레드시트 자동화와 검증 규칙",
        "result": "결산 일수가 약 5일에서 3일로 줄었다",
        "numericResult": "결산 5일→3일",
        "starSituation": "수작업 대조로 실수와 야근이 많았다",
        "starTask": "반복 검증을 자동화해야 했다",
        "starAction": "매핑표와 매크로로 예외만 남기게 했다",
        "starResult": "결산 속도와 정확도가 개선되었다",
        "skills": ["Excel", "회계"],
    },
    "부가세 신고": {
        "description": (
            "신고 직전 세금계산서 불일치가 발견되었다. "
            "세무 보조로서 거래처별 대사표를 만들고 누락분을 추적해 "
            "수정신고로 가산세를 피했다."
        ),
        "role": "세무 보조",
        "contribution": "거래처 대사와 누락분 수정신고 지원",
        "result": "가산세 없이 신고를 마쳤다",
        "starSituation": "합계와 계산서 건수가 맞지 않았다",
        "starTask": "누락·중복을 기한 내 정리해야 했다",
        "starAction": "거래처별 전수 대사 후 수정을 반영했다",
        "starResult": "신고가 완료되고 가산세가 발생하지 않았다",
        "skills": ["세무", "부가세"],
    },
    "온보딩 UI": {
        "description": (
            "앱 첫 주 이탈이 높았다. UI 디자이너로서 온보딩 단계를 줄인 "
            "프로토타입을 만들고 사용성 테스트로 막히는 화면을 고쳤다."
        ),
        "role": "UI 디자이너",
        "contribution": "온보딩 플로우 단순화와 사용성 테스트",
        "result": "온보딩 완주율이 상승했다",
        "starSituation": "단계가 길어 중도 이탈이 많았다",
        "starTask": "첫 경험을 짧게 만들어야 했다",
        "starAction": "Figma 프로토타입으로 대안을 검증했다",
        "starResult": "완주율이 개선되고 이탈이 줄었다",
        "skills": ["Figma", "UX"],
    },
    "디자인 시스템 토큰": {
        "description": (
            "컬러·타이포가 화면마다 달라 구현이 흔들렸다. "
            "프로덕트 디자이너로서 디자인 토큰을 정의하고 "
            "개발과 네이밍을 맞춰 핸드오프 문서를 남겼다."
        ),
        "role": "프로덕트 디자이너",
        "contribution": "디자인 토큰 정의와 개발 네이밍 합의",
        "result": "구현 일관성이 높아지고 핸드오프 시간이 줄었다",
        "starSituation": "스타일 파편화로 QA 이슈가 늘었다",
        "starTask": "공통 토큰으로 맞춰야 했다",
        "starAction": "토큰 표와 사용 규칙을 문서화했다",
        "starResult": "화면 간 편차가 줄었다",
        "skills": ["Design Token", "핸드오프"],
    },
    "신규 거래처 발굴": {
        "description": (
            "파이프라인이 부족해 분기 목표가 위태로웠다. "
            "영업 사원으로서 콜드콜·소개를 늘리고 니즈 인터뷰 후 "
            "맞춤 제안서로 신규 계약을 만들었다."
        ),
        "role": "영업 사원",
        "contribution": "신규 발굴과 맞춤 제안서 작성",
        "result": "분기 신규 계약 12건을 달성했다",
        "numericResult": "분기 신규 12건",
        "starSituation": "기존 고객만으로는 목표 달성이 어려웠다",
        "starTask": "신규 파이프라인을 채워야 했다",
        "starAction": "업종별 스크립트와 제안 템플릿을 운영했다",
        "starResult": "목표를 초과 달성했다",
        "skills": ["CRM", "B2B영업"],
    },
    "고객 클레임": {
        "description": (
            "납기 지연으로 해지 위험이 있었다. 영업 담당으로서 "
            "생산·물류와 일정을 다시 맞추고 고객과 대안 납기를 협의했다."
        ),
        "role": "영업 담당",
        "contribution": "납기 재협의와 내부 일정 싱크",
        "result": "계약을 유지하고 해지를 막았다",
        "starSituation": "지연 통보 후 고객 불만이 커졌다",
        "starTask": "신뢰 회복과 일정 합의가 필요했다",
        "starAction": "주간 싱크로 현실 가능한 일정을 제시했다",
        "starResult": "클레임이 해소되고 거래가 이어졌다",
        "skills": ["협상", "CS"],
    },
    "모바일 개편 프로젝트 리딩": {
        "description": (
            "요구사항이 폭주해 일정이 흔들렸다. 프로덕트 매니저로서 "
            "우선순위 워크숍으로 MVP를 정하고 백로그를 잘라 "
            "예정일 안에 출시했다."
        ),
        "role": "프로덕트 매니저",
        "contribution": "MVP 정의와 일정·스코프 관리",
        "result": "합의한 출시일에 모바일 개편을 배포했다",
        "starSituation": "기능 요청이 일정 용량을 넘어섰다",
        "starTask": "출시 가능한 범위를 고정해야 했다",
        "starAction": "우선순위 워크숍과 백로그 트리밍을 진행했다",
        "starResult": "일정 내 출시와 핵심 KPI를 확보했다",
        "skills": ["Jira", "Roadmap"],
    },
    "장애 사후분석": {
        "description": (
            "장애 원인이 팀에 공유되지 않아 같은 문제가 반복되었다. "
            "프로젝트 매니저로서 포스트모템 템플릿과 액션 오너를 정해 "
            "재발 방지 과제를 추적했다."
        ),
        "role": "프로젝트 매니저",
        "contribution": "포스트모템 표준화와 액션 트래킹",
        "result": "동일 유형 장애 재발이 줄었다",
        "starSituation": "사후 논의가 구두로만 끝나고 기록이 없었다",
        "starTask": "원인과 액션을 남겨야 했다",
        "starAction": "템플릿과 주간 액션 리뷰를 도입했다",
        "starResult": "재발률이 감소하고 공유가 빨라졌다",
        "skills": ["포스트모템", "장애관리"],
    },
    "채용 인터뷰 루브릭": {
        "description": (
            "면접 평가가 면접관마다 달라 이의제기가 있었다. "
            "HR 담당으로서 직무별 평가 루브릭을 만들고 "
            "면접관 교육을 진행해 기준을 맞췄다."
        ),
        "role": "HR 담당",
        "contribution": "직무별 인터뷰 루브릭과 면접관 교육",
        "result": "평가 편차와 이의제기가 줄었다",
        "starSituation": "주관적 점수 편차가 컸다",
        "starTask": "공통 평가 기준이 필요했다",
        "starAction": "루브릭을 배포하고 모의 면접으로 연습했다",
        "starResult": "평가 일관성이 높아졌다",
        "skills": ["채용", "면접"],
    },
    "온보딩 30일": {
        "description": (
            "입사 초 이탈이 높았다. 인사 담당으로서 멘토 매칭과 "
            "30일 체크리스트·부서별 온보딩 맵을 만들어 "
            "첫 달을 구조화했다."
        ),
        "role": "인사 담당",
        "contribution": "30일 온보딩 프로그램과 멘토 매칭",
        "result": "조기 퇴사율이 개선되고 90일 잔존율이 올랐다",
        "starSituation": "입사 초기 역할이 모호했다",
        "starTask": "첫 30일을 안내해야 했다",
        "starAction": "체크리스트와 멘토 일정을 운영했다",
        "starResult": "조기 이탈이 줄었다",
        "skills": ["온보딩", "HR"],
    },
    "피크 타임 동선": {
        "description": (
            "저녁 피크에 주방·홀이 겹쳐 대기가 늘었다. "
            "레스토랑 매니저로서 동선을 시뮬하고 역할 카드로 "
            "배치를 바꿔 병목을 줄였다."
        ),
        "role": "레스토랑 매니저",
        "contribution": "피크 타임 동선 재배치와 역할 카드",
        "result": "대기 시간이 줄고 테이블 회전이 원활해졌다",
        "starSituation": "피크에 동선이 꼬여 클레임이 늘었다",
        "starTask": "동선과 역할을 재설계해야 했다",
        "starAction": "시뮬레이션 후 배치를 변경했다",
        "starResult": "대기가 감소했다",
        "skills": ["매장운영", "동선관리"],
    },
    "원가율 관리": {
        "description": (
            "식자재 폐기가 많아 원가율이 높았다. 주방장으로서 "
            "폐기량을 기록하고 발주를 주간 단위로 조정해 "
            "재고를 맞췄다."
        ),
        "role": "주방장",
        "contribution": "폐기 기록과 발주 최적화",
        "result": "원가율이 약 32%에서 28%로 안정되었다",
        "numericResult": "원가율 32%→28%",
        "starSituation": "발주가 감에 의존했다",
        "starTask": "폐기와 발주를 데이터로 맞춰야 했다",
        "starAction": "주간 리뷰로 발주량을 조정했다",
        "starResult": "목표 원가율을 유지했다",
        "skills": ["원가관리", "발주"],
    },
    "계약서 검토": {
        "description": (
            "부서마다 필수 조항 누락이 있었다. 법무 어시스턴트로서 "
            "표준 조항 리스크 체크리스트를 만들고 교육을 진행해 "
            "검토 기준을 맞췄다."
        ),
        "role": "법무 어시스턴트",
        "contribution": "계약 검토 체크리스트와 부서 교육",
        "result": "누락 조항과 재검토 요청이 줄었다",
        "starSituation": "검토 기준이 사람마다 달랐다",
        "starTask": "공통 체크리스트가 필요했다",
        "starAction": "조항별 리스크 표시와 교육을 진행했다",
        "starResult": "검토 품질이 균일해졌다",
        "skills": ["계약", "법무"],
    },
    "개인정보 처리방침": {
        "description": (
            "개인정보 법령 개정 기한이 촉박했다. 컴플라이언스 담당으로서 "
            "개정 조항 매핑표를 만들고 법무 검수 후 방침을 기한 내 게시했다."
        ),
        "role": "컴플라이언스 담당",
        "contribution": "법령 매핑과 처리방침 개정 게시",
        "result": "기한 내 개정을 완료해 규제 리스크를 줄였다",
        "starSituation": "개정 반영 항목이 불명확했다",
        "starTask": "기한 내 방침을 업데이트해야 했다",
        "starAction": "매핑표로 누락 없이 반영하고 검수했다",
        "starResult": "게시가 완료되고 점검에 대비했다",
        "skills": ["개인정보", "컴플라이언스"],
    },
    "이탈 고객 코호트": {
        "description": (
            "가입 경로별 잔존 차이가 설명되지 않았다. "
            "데이터 분석가로서 코호트 분석을 대시보드로 공유하고 "
            "온보딩 실험 우선순위를 제안했다."
        ),
        "role": "데이터 분석가",
        "contribution": "코호트 분석과 주간 대시보드",
        "result": "온보딩 실험이 착수되고 리텐션 논의가 데이터 기반으로 바뀌었다",
        "starSituation": "이탈 원인이 감으로만 논의되었다",
        "starTask": "경로별 잔존을 분해해야 했다",
        "starAction": "SQL·시각화로 코호트를 공유했다",
        "starResult": "실험 백로그가 합의되었다",
        "skills": ["SQL", "Tableau"],
    },
    "광고 성과 어트리뷰션": {
        "description": (
            "라스트클릭만으로 예산이 왜곡되었다. 그로스 분석가로서 "
            "멀티터치 모델을 비교하고 채널 기여도를 재정의한 리포트를 냈다."
        ),
        "role": "그로스 분석가",
        "contribution": "어트리뷰션 모델 비교와 예산 재배분 제안",
        "result": "채널 ROI 기준으로 예산이 재배분되었다",
        "starSituation": "라스트클릭이 특정 채널을 과대평가했다",
        "starTask": "기여도를 다시 정의해야 했다",
        "starAction": "모델 비교 리포트로 합의를 이끌었다",
        "starResult": "예산 효율이 개선되었다",
        "skills": ["Attribution", "Python"],
    },
}


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


def match_payload(title: str) -> dict | None:
    for key, payload in BY_TITLE.items():
        if key in title:
            return payload
    return None


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


def main() -> int:
    token = api("POST", "/api/v1/auth/login", body={"email": EMAIL, "password": PASSWORD})["accessToken"]
    exps = api("GET", "/api/v1/experiences", token) or []
    print(f"experiences={len(exps)}")
    missing = []
    for exp in exps:
        title = exp.get("title") or ""
        payload = match_payload(title)
        if not payload:
            missing.append(title)
            continue
        patch = {k: v for k, v in payload.items()}
        desc = (patch.get("description") or "").strip()
        if len(desc) < 80:
            patch["description"] = (desc + " 관련 기록과 회고를 남겨 이후에도 같은 방식으로 재현할 수 있게 했다.")[:2000]
        # 기간 유지
        if exp.get("startDate"):
            patch["startDate"] = str(exp["startDate"])[:10]
        if exp.get("endDate"):
            patch["endDate"] = str(exp["endDate"])[:10]
        updated = api("PATCH", f"/api/v1/experiences/{exp['id']}", token, patch)
        if readiness(updated) != "ready":
            raise RuntimeError(
                f"not ready: {title} desc={len(updated.get('description') or '')} "
                f"result={len(updated.get('result') or '')}"
            )
    if missing:
        print("UNMATCHED", missing)
        return 1
    emb = api("POST", "/api/v1/experiences/embed-all", token, timeout=300)
    print("embed", emb)
    exps2 = api("GET", "/api/v1/experiences", token) or []
    ready = sum(1 for e in exps2 if readiness(e) == "ready")
    # 공통 템플릿 잔존 검사
    bad = [e["title"] for e in exps2 if "이해관계자와 일정" in (e.get("description") or "")]
    print(f"ready={ready}/{len(exps2)} boilerplate_left={bad}")
    return 0 if ready == len(exps2) and not bad else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("ERROR", e, file=sys.stderr)
        sys.exit(2)
