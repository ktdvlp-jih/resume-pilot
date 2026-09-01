# ResumePilot

**정체성:** RAG 기반 기업 맞춤 자기소개서 작성·첨삭 플랫폼. 경험 라이브러리 → 공고 분석 → RAG 추천 → AI 생성·첨삭·흔적 탐지.

**스택:** Spring Boot 3.5 (Java 21) · React 19 / shadcn·Radix UI / Vite 8 · FastAPI × 3 · PostgreSQL 17 + pgvector · Docker prod 5컨테이너

**개발:** 터미널에서 각 서비스 실행 (`docs/실행-가이드.md`)
**배포:** `docker-compose.yml` · `docs/설치-가이드.md` Part 3 (`DEPLOY_HOST`는 로컬 `.env`만)

## 주요 경로

| 영역 | 경로 |
|------|------|
| API | `resume-api/src/main/java/com/resumepilot/` |
| 사용자 UI | `resume-web/src/` |
| 관리자 UI | `resume-admin/src/` (`/admin/` base) |
| AI Gateway | `resume-ai/app/` |
| Prompt / RAG | `prompt-service/app/`, `rag-service/app/` |
| 실행 가이드 | `docs/실행-가이드.md` |
| 설치·배포 | `docs/설치-가이드.md`, `docs/인프라-구성.md` |
| 아키텍처 | `docs/아키텍처.md` |
| SpecStory | `.specstory/history/` — **로컬 전용** (Git 제외) |

## 핵심 원칙

1. AI는 사용자 경험을 **지어내지 않는다** — 근거 부족 시 "내용이 부족하여 생성하지 않음"
2. 프롬프트는 **prompt-service**에서만 로드 (하드코딩 금지)
3. AI 호출은 `ai_usage_logs`에 기록
4. Flyway 마이그레이션은 **resume-api**만 소유
5. LLM은 **외부 API 호출** (Admin `/admin/llm-settings`). 서버에 모델 가중치를 올리지 않음
6. 사용자 UI·AI reply에는 **쉬운 말만** — STAR·RAG·draft 등 전문 용어 금지 (`.cursor/rules/user-facing-language.mdc`)

영역별 세부 규칙: `.claude/rules/` (백엔드·프론트·AI 서비스·비밀정보·커밋 규칙)
