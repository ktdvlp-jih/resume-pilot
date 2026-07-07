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

---

## Phase 5 — 완료 항목

| 항목 | 내용 |
|------|------|
| **Admin DataTable** | Users, AI Logs, Companies, Forbidden — Search + Sort + Pagination |
| **URL sort/page** | web Dashboard, Experiences, JobPostings — `?sort=&dir=&page=` |
| **Workspace resize** | xl+ 드래그 리사이즈 + localStorage |
| **Onboarding guide** | Dashboard 3단계 CTA (경험 → 공고 → 워크스페이스) |

---

## Phase 6 — 다음 스프린트 (제안)

| 항목 | 참고 | 우선순위 |
|------|------|----------|
| **E2E / deploy smoke** | Quick Tunnel `:9180` | P1 |
| **Admin ⌘K + page transition** | web Phase 4 패리티 | P2 |
| **WritingStyle / Settings UX** | Notion form polish | P2 |
| **VersionCompare diff UI** | GitHub diff 스타일 | P2 |
| **Performance** | code-split, lazy routes | P3 |
| **Analytics / error tracking** | Sentry 등 | P3 |

**Out of scope:** 결제, 소셜 로그인

---

## 벤치마크 매핑

| 영역 | 상태 |
|------|------|
| App shell | ✅ |
| List / CRUD (web) | ✅ |
| List / CRUD (admin) | ✅ |
| Workspace | ✅ (리사이즈 포함) |
| Landing / Auth | ✅ |
| Onboarding | ✅ |

---

## 타임라인

```mermaid
gantt
    title ResumePilot UI Roadmap
    dateFormat YYYY-MM-DD
    section Foundation
    Phase 0-4           :done, 2026-06-01, 2026-07-07
    section Scale
    Phase 5               :done, 2026-07-07, 2026-07-07
    section Next
    Phase 6 smoke polish  :active, 2026-07-08, 2026-07-20
```
