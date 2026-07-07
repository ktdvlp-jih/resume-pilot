# ResumePilot UI 로드맵

> 벤치마크: Notion · Linear · Vercel · Clerk · Supabase · Cursor  
> 기준: shadcn/ui + Radix · Violet OKLCH · Geist

## 현재 단계 (2026-07)

| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 0–1** | ✅ | shadcn, Layout, Nav, 공통 UI |
| **Phase 2A–B** | ✅ | DataTable, Workspace 3-pane |
| **Phase 3–4** | ✅ | Landing/Auth, ⌘K, Breadcrumb, Sort |
| **Phase 5** | ✅ | Admin DataTable, URL sort/page, Workspace resize, Onboarding |
| **Phase 6** | ✅ | Deploy smoke doc, Admin ⌘K, Diff UI, lazy routes, Sentry-ready |

---

## Phase 6 — 완료 항목

| 항목 | 내용 |
|------|------|
| **Admin ⌘K + transition** | Command palette, page fade-in |
| **Admin URL pagination** | Users, AI Logs, Companies, Forbidden — `?sort=&dir=&page=` |
| **WritingStyle / Settings UX** | Section 기반 Notion-style 폼 |
| **VersionCompare diff** | LCS diff, split/unified, line numbers |
| **Onboarding dismiss** | localStorage + X 버튼 |
| **Performance** | React.lazy + manualChunks (메인 번들 ~168kB) |
| **Error tracking** | ErrorBoundary + optional `VITE_SENTRY_DSN` |
| **Deploy smoke** | 빌드 검증 + `docs/deploy-test-cases.md` (서버 미기동 시 수동) |

---

## Phase 7 — 다음 스프린트 (제안)

| 항목 | 우선순위 |
|------|----------|
| **E2E (Playwright)** | P1 |
| **Admin PromptsPage toolbar 정렬** | P2 |
| **Workspace autosave indicator** | P2 |
| **Dark/light admin theme toggle** | P3 |
| **PWA / offline shell** | P3 |

**Out of scope:** 결제, 소셜 로그인

---

## 벤치마크 매핑

| 영역 | 상태 |
|------|------|
| App shell | ✅ |
| List / CRUD (web + admin) | ✅ |
| Workspace | ✅ |
| Landing / Auth | ✅ |
| Onboarding | ✅ |
| Version diff | ✅ |
| Error tracking | ✅ (DSN optional) |

---

## 타임라인

```mermaid
gantt
    title ResumePilot UI Roadmap
    dateFormat YYYY-MM-DD
    section Foundation
    Phase 0-5           :done, 2026-06-01, 2026-07-07
    section Scale
    Phase 6               :done, 2026-07-07, 2026-07-07
    section Next
    Phase 7 E2E polish  :active, 2026-07-08, 2026-07-25
```
