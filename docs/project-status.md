# ResumePilot 프로젝트 현황

> **최종 갱신:** 2026-07-07  
> **프로젝트 착수:** 2026-07-05  
> **목표 마감:** 2026-09-05 (착수 후 2개월)  
> **WBS (잔여):** [planning/wbs-resume-pilot.md](planning/wbs-resume-pilot.md)

---

## 1. 한눈에 보기

| 영역 | 상태 | 비고 |
|------|------|------|
| 백엔드 API (Spring) | ✅ 완료 | Flyway V1–V11, 11 controllers |
| AI 3서비스 (FastAPI) | ✅ 완료 | resume-ai, prompt-service, rag-service |
| 사용자 UI (resume-web) | ✅ MVP+ | Phase 0–8, shadcn, Workspace 3-pane |
| 관리자 UI (resume-admin) | ✅ MVP+ | Prompts·Users·AI logs·금지어·Companies |
| Docker Prod (5컨테이너) | ✅ 완료 | SPA-in-JAR 단일 포트 |
| CI/CD (self-hosted) | ✅ 완료 | deploy.yml + HTTP/API/E2E smoke |
| E2E (로컬) | ✅ smoke + user journey | CI는 smoke 4건만 |
| **잔여 (Phase 9+)** | 🔲 진행 예정 | 아래 §4 |

---

## 2. 완료 산출물 (2026-07-07 기준)

### 2.1 백엔드 · DB

| 항목 | 경로·산출물 |
|------|-------------|
| Flyway 마이그레이션 | `resume-api/.../db/migration/V1`–`V11` |
| 인증 JWT + refresh (jti) | `JwtTokenProvider`, `AuthService` |
| Actuator health | `/actuator/health` |
| 도메인 API | experience, job-posting, resume, user, writing-style, ai, rag, admin, company |
| Swagger | `/swagger-ui.html`, `/api-docs` |

### 2.2 AI 파이프라인

| 서비스 | 포트 (dev) | 역할 |
|--------|------------|------|
| resume-ai | 8000 | Gateway: generate, detect, review, analyze |
| prompt-service | 8001 | 프롬프트 render·version·test |
| rag-service | 8002 | embedding, search, context/build |

상세: [rag-pipeline.md](rag-pipeline.md)

### 2.3 프론트엔드

| 앱 | 주요 화면 |
|----|-----------|
| resume-web | `/`, `/dashboard`, `/experiences`, `/job-postings`, `/writing-style`, `/workspace`, `/settings`, `/resumes/:id/versions` |
| resume-admin | `/admin/prompts`, `/forbidden-expressions`, `/companies`, `/users`, `/ai-logs` |

UI Phase 0–8 완료: [ui-roadmap.md](ui-roadmap.md)

### 2.4 인프라 · 배포

| 항목 | 산출물 |
|------|--------|
| Docker Compose prod | `docker-compose.yml` — 5 containers |
| SPA prod 빌드 | `resume-api/Dockerfile.prod` |
| 배포 스크립트 | `scripts/resume-pilot.sh deploy` |
| 원격 배포 | `scripts/deploy-remote.ps1` / `.sh` |
| Quick Tunnel | `resume-pilot.sh quick-tunnel` (선택) |

상세: [INFRASTRUCTURE.md](INFRASTRUCTURE.md), [deployment.md](deployment.md)

### 2.5 CI/CD · 스모크 (✅ 2026-07-07 통과)

`master` push → `.github/workflows/deploy.yml`:

| 순서 | 단계 | 스크립트 |
|------|------|----------|
| 1 | git sync + Docker deploy | `resume-pilot.sh deploy` |
| 2 | HTTP + API smoke (12 checks) | `deploy-smoke.sh` |
| 3 | E2E smoke (Playwright 4/4) | `deploy-smoke-e2e.sh` (Docker) |

수동 검증: `scripts/deploy-smoke.ps1` (터널 URL)

장애 이력: [reports/deploy-ci-incidents-2026-07-07.md](reports/deploy-ci-incidents-2026-07-07.md)

### 2.6 테스트

| 종류 | 위치 | CI 포함 |
|------|------|---------|
| API 통합 | `resume-api` tests | ❌ (로컬 Gradle) |
| E2E smoke | `e2e/tests/smoke.spec.ts` | ✅ |
| E2E user journey | `e2e/tests/user-journey.spec.ts` | ✅ (`deploy-smoke-e2e.sh`) |
| 배포 TC | [deploy-test-cases.md](deploy-test-cases.md) | 일부 자동화 |

---

## 3. 기술 스택 (현재)

[architecture.md §2](architecture.md#2-기술-스택-요약) 정본.

---

## 4. 잔여 작업 (Phase 9+)

| ID | 항목 | 우선순위 | WBS | 상태 |
|----|------|----------|-----|------|
| R1 | User journey E2E → CI | P2 | 1.x | ✅ |
| R2 | AI E2E 브라우저 플로우 (TC-AI-05) 검증·자동화 | P2 | 1.x | ✅ |
| R3 | Workspace draft clear 버튼 | P3 | 2.x | ✅ |
| R4 | Admin Prompts 버전 diff 미리보기 | P3 | 2.x | ✅ |
| R5 | Sentry prod (`VITE_SENTRY_DSN`) | P3 | 3.x | ⏸️ 보류 |
| R6 | Named Tunnel 고정 도메인 (Quick Tunnel 대체) | P3 | 3.x | ⏸️ 패스 |
| R7 | API 통합 테스트 보강 (`/users/me` 등) | P2 | 1.x | ✅ |
| R8 | 사용자/관리자 가이드·온보딩 문서 | P3 | 4.x | ✅ |
| R9 | 부하·보안 점검 | P3 | 5.x | ✅ (1차) |

**범위 외:** 결제, 소셜 로그인

일정: [planning/wbs-resume-pilot.md](planning/wbs-resume-pilot.md)

---

## 5. 문서 맵

| 문서 | 용도 |
|------|------|
| [RUNNING.md](RUNNING.md) | 로컬 개발 실행 |
| [SETUP.md](SETUP.md) | 설치·Ubuntu 배포 |
| [deployment.md](deployment.md) | 배포·CI 상세 |
| [deploy-test-cases.md](deploy-test-cases.md) | QA 체크리스트 |
| [user-guide.md](user-guide.md) | 일반 사용자 온보딩/사용 가이드 |
| [admin-guide.md](admin-guide.md) | 관리자 운영 가이드 |
| [ui-roadmap.md](ui-roadmap.md) | UI Phase 이력 |
| [reports/ui-work-2026-07-07.md](reports/ui-work-2026-07-07.md) | UI 작업 보고 |
| [reports/deploy-ci-incidents-2026-07-07.md](reports/deploy-ci-incidents-2026-07-07.md) | CI 장애 보고 |
| [reports/security-load-check-2026-07-07.md](reports/security-load-check-2026-07-07.md) | 보안·부하 점검 리포트 |
| [reports/ai-e2e-recheck-criteria.md](reports/ai-e2e-recheck-criteria.md) | AI E2E 재실행 기준 |
| [reports/daily-work-2026-07-07.md](reports/daily-work-2026-07-07.md) | 2026-07-07 일일 작업 보고 |

---

*다음 갱신 시: 잔여 WBS 완료 항목을 §2로 이동하고 §4에서 제거*
