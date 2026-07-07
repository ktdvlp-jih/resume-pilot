# ResumePilot UI 로드맵

> **프로젝트 현황:** [project-status.md](project-status.md)  
> **작업 보고:** `docs/reports/ui-work-2026-07-07.md`  
> **잔여 WBS:** [planning/wbs-resume-pilot.md](planning/wbs-resume-pilot.md)

## 현재 단계 (2026-07)

| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 0–8** | ✅ | Foundation → CI/CD smoke green (2026-07-07) |

---

## Phase 8 — 완료 (2026-07-07)

| 항목 | 내용 |
|------|------|
| **Deploy smoke** | `deploy-smoke.sh` — HTTP 5 + API 7 |
| **CI E2E smoke** | `deploy-smoke-e2e.sh` — Playwright Docker, 4/4 |
| **Workspace AI draft** | `useWorkspaceResult` localStorage |
| **Prompts version table** | DataTable sort/page |
| **Header nav** | 로고·중복 메뉴 정리 (사이드바 단일 네비) |

### 스모크 vs 배포

| 구분 | 내용 | CI |
|------|------|-----|
| **배포** | Docker build/up | ✅ |
| **HTTP+API smoke** | curl 12 checks | ✅ |
| **E2E smoke** | Playwright `smoke.spec.ts` | ✅ |
| **User journey E2E** | signup→experience→workspace | 🔲 수동만 |

---

## Phase 9 — 진행 중

### UX (2026-07-07 ✅)

| 항목 | 상태 |
|------|------|
| Workspace draft **초기화** 버튼 | ✅ |
| Admin Prompts **버전 diff** 미리보기 | ✅ |

### 잔여 (2026-07-08 ~ 09-05)

| 항목 | 우선순위 | WBS | 상태 |
|------|----------|-----|------|
| User journey E2E in CI | P2 | 1.x | 🔲 |
| API 통합 테스트 보강 | P2 | 1.x | 🔲 |
| AI E2E (TC-AI-05) 검증 | P2 | 1.x | ✅ |
| Sentry prod · Named Tunnel | P3 | 3.x | 🔲 |
| 사용자 가이드·보안 점검 | P3 | 4–5.x | 🔲 |
