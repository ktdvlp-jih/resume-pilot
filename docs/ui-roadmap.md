# ResumePilot UI 로드맵

> 벤치마크: Notion · Linear · Vercel · Clerk · Supabase · Cursor  
> 기준: shadcn/ui + Radix · Violet OKLCH · Geist  
> 작업 보고: `docs/reports/ui-work-2026-07-07.md`

## 현재 단계 (2026-07)

| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 0–1** | ✅ | shadcn, Layout, Nav, 공통 UI |
| **Phase 2A–B** | ✅ | DataTable, Workspace 3-pane |
| **Phase 3–4** | ✅ | Landing/Auth, ⌘K, Breadcrumb, Sort |
| **Phase 5** | ✅ | Admin DataTable, URL sort/page, resize, Onboarding |
| **Phase 6** | ✅ | Diff UI, lazy routes, Sentry-ready, Admin ⌘K |
| **Phase 7** | ✅ | Playwright E2E, autosave, PWA, admin theme |

---

## Phase 7 — 완료 항목

| 항목 | 내용 |
|------|------|
| **Playwright E2E** | `e2e/` smoke + user journey |
| **Workspace autosave** | localStorage draft + indicator |
| **Admin PromptsPage** | SearchBar + URL `?q=&prompt=` |
| **Admin theme** | light/dark toggle |
| **PWA** | vite-plugin-pwa (web) |

---

## Phase 8 — 다음 (제안)

| 항목 | 우선순위 |
|------|----------|
| **CI Playwright job** | P1 |
| **Workspace AI result draft** | P2 |
| **Admin Prompts version table** | P3 |

---

## 프로덕션 스모크

URL: https://suite-pic-heaven-sacrifice.trycloudflare.com — `/`, `/admin/`, `/swagger-ui.html` → 200 ✅
