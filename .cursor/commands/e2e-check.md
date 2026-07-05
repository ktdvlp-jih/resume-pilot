# E2E 체크 (배포·데모 전)

`docs/RUNNING.md` §5 시나리오 기준으로 확인하고 표로 요약:

1. **인프라** — PostgreSQL, API(8080/9180), AI 3개(8000~8002) 기동 여부
2. **Phase 1** — 회원가입 → 경험 등록 → 자소서 생성 → 버전 diff
3. **Phase 2** — 공고 텍스트/URL/PDF 분석
4. **Phase 3~4** — RAG 경험 추천 → AI 생성·첨삭·흔적
5. **Phase 5** — Admin Prompt/금지표현/사용자 (`/admin/`)

블로커만 P0/P1로 보고.
