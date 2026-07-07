# ResumePilot UI 로드맵

> 벤치마크: Notion · Linear · Vercel · Clerk · Supabase · Cursor  
> 기준: shadcn/ui + Radix · Violet OKLCH · Geist

## 현재 단계 (2026-07)

| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 0** | ✅ 완료 | shadcn/Radix 마이그레이션, 디자인 토큰, Public/App 레이아웃 |
| **Phase 1** | ✅ 완료 | Logo→Home, Dashboard 분리, Sidebar 그룹, Empty/Toast/Confirm |
| **Phase 2A** | ✅ 완료 | DataTable + Search + Pagination |
| **Phase 2B** | ✅ 완료 | Workspace 3-pane |
| **Phase 3** | ✅ 완료 | Landing hero·preview, split auth, footer links |
| **Phase 4** | ✅ 완료 | ⌘K, Breadcrumb, column sort, table skeleton, page transitions |

---

## Phase 5 — 다음 스프린트 (제안)

| 항목 | 참고 | 우선순위 |
|------|------|----------|
| resume-admin DataTable toolbar 통일 | Supabase | P1 |
| Workspace 패널 리사이즈 | Cursor | P2 |
| 테이블 컬럼 정렬 URL 쿼리 유지 | Supabase | P2 |
| 온보딩 empty state 가이드 | Clerk | P2 |
| 실제 요금제·결제 | — | Out of scope |
| 소셜 로그인 | Clerk | Out of scope |

---

## 벤치마크 매핑

| ResumePilot 영역 | Primary benchmark | 상태 |
|------------------|-------------------|------|
| App shell | Linear | ✅ |
| List / CRUD | Supabase | ✅ |
| Workspace | Cursor | ✅ (리사이즈 제외) |
| Landing | Vercel | ✅ |
| Auth | Clerk | ✅ (split layout) |
| Admin | Supabase | ⏳ Phase 5 |

---

## 타임라인

```mermaid
gantt
    title ResumePilot UI Roadmap
    dateFormat YYYY-MM-DD
    section Foundation
    Phase 0-1           :done, 2026-06-01, 2026-07-06
    section Core UX
    Phase 2A DataTable  :done, 2026-07-07, 2026-07-07
    Phase 2B Workspace  :done, 2026-07-07, 2026-07-07
    section Growth
    Phase 3 Landing     :done, 2026-07-07, 2026-07-07
    section Polish
    Phase 4 CmdK etc    :done, 2026-07-07, 2026-07-07
    section Next
    Phase 5 Admin UX    :active, 2026-07-08, 2026-07-15
```
