---
paths:
  - "resume-web/**/*.ts"
  - "resume-web/**/*.tsx"
  - "resume-admin/**/*.ts"
  - "resume-admin/**/*.tsx"
---

# Frontend (resume-web · resume-admin)

- UI: Tailwind v4 CSS-first + shadcn(radix-nova). 디자인 토큰은 각 앱 `src/index.css` 단일 파일 — **두 앱의 index.css는 항상 바이트 동일하게 유지** (한쪽 수정 시 복사 동기화)
- 색상: 시맨틱 토큰만 사용 (`bg-background`, `text-muted-foreground`, `bg-tag-*`, `bg-success` 등). Tailwind 팔레트 직접 사용(`bg-blue-100` 등) 금지
- 폰트: Geist(라틴) + Pretendard(한글) — `--font-sans` 스택으로 관리, 본문 `break-keep`
- 컴포넌트: `@/components/ui/*` (shadcn) 우선 사용, 상태 표시는 `common/status-chip.tsx` 패턴
- i18n: `src/i18n/locales/{ko,en,ja,zh}.json` — 사용자 문구 하드코딩 지양
- API: `src/lib/api-base.ts`, dev 시 `VITE_API_URL=http://localhost:8080`
- resume-admin: `VITE_BASE=/admin/` (vite.config.ts)
- 상태: TanStack Query, 라우팅: react-router-dom

변경 후 해당 앱에서 `npm run build` 로 타입·빌드 확인.
