# 보안·부하 점검 리포트 (R9 1차)

> 일시: 2026-07-07
> 대상: https://suite-pic-heaven-sacrifice.trycloudflare.com
> 범위: 헤더/인증/CORS/경량 부하

## 1) 보안 헤더 점검

검증 경로: `/`, `/admin/`, `/swagger-ui.html`, `/api-docs`, `/actuator/health`

### 결과

- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` ✅
- `Content-Security-Policy` ❌ (미설정)

### 판단

기본 보안 헤더는 적용되어 있으나, CSP 미설정은 중기 개선 과제.

## 2) 인증/인가 기본 점검

- `GET /api/v1/users/me` (무토큰) → `401` ✅

판단: 인증 보호 동작 정상.

## 3) CORS 프리플라이트 점검

`OPTIONS /api/v1/auth/login` with Origin `http://localhost:5173`

- `Access-Control-Allow-Origin: http://localhost:5173` ✅
- `Access-Control-Allow-Methods`에 `POST` 포함 ✅
- `Access-Control-Allow-Headers`에 `content-type, authorization` 포함 ✅

판단: 개발/웹 클라이언트 CORS 정상.

## 4) 경량 부하 스모크

대상: `/actuator/health`

- 총 요청: 60
- 성공: 60
- 실패: 0
- 평균 응답시간: 60.9ms
- p95: 62ms

판단: 1차 헬스 엔드포인트 부하에서는 안정.

## 5) 리스크/추가 권고

- `rate limit` 정책은 확인 문서/코드 부재 → 후속 과제
- CSP 부재 → 프론트 리소스 정책 정의 필요
- 본 점검은 경량 스모크 수준이며, 대량 트래픽(k6) 부하시험은 별도 수행 필요

## 6) 결론

R9 1차 범위(JWT/CORS/기본 헤더/경량 부하)는 통과.

잔여:

1. CSP 정책 도입
2. rate limit 정책 수립/적용
3. k6 기반 부하 시나리오(생성 API 포함) 실행
