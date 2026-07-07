# ResumePilot UI 로드맵

> 작업 보고: `docs/reports/ui-work-2026-07-07.md`

## 현재 단계 (2026-07)

| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 0–7** | ✅ | Foundation → E2E, PWA, admin theme |
| **Phase 8** | ✅ | Deploy smoke 확장, AI result draft, Prompts version table |

---

## Phase 8 — 완료

| 항목 | 내용 |
|------|------|
| **Deploy smoke** | `scripts/deploy-smoke.sh` — `/`, `/admin/`, swagger 200 |
| **CI E2E smoke** | `deploy.yml` post-deploy Playwright `smoke.spec.ts` (localhost) |
| **Workspace AI draft** | `useWorkspaceResult` — 생성 결과·추천·면접 질문 localStorage |
| **Prompts version table** | Sort + pagination DataTable |

### 스모크 vs 배포

| 구분 | 내용 |
|------|------|
| **배포** | Docker 이미지 빌드·컨테이너 기동 |
| **HTTP 스모크** | 기동 후 URL 3개 200 확인 (가벼움) |
| **E2E 스모크** | Playwright로 브라우저 렌더링 검증 (smoke.spec만 CI) |
| **User journey E2E** | signup→experience 등 — 로컬/`e2e/` 수동 실행 |

---

## Phase 9 제안

| 항목 | 우선순위 |
|------|----------|
| User journey E2E in CI (선택) | P2 |
| Workspace draft clear 버튼 | P3 |
| Prompts 버전 diff 미리보기 | P3 |
