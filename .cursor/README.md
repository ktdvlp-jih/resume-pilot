# ResumePilot — Cursor 설정

**실행·설치:** [docs/설치-가이드.md](../docs/설치-가이드.md) · [docs/실행-가이드.md](../docs/실행-가이드.md)

프로젝트 공유 AI 워크플로. Cursor **창 새로고침** 후 `/` 명령·훅 반영.

## 구조

| 종류 | 경로 | 용도 |
|------|------|------|
| **규칙** | `.cursor/rules/*.mdc` | 항상·파일별 제약 |
| **스킬** | `.cursor/skills/*/SKILL.md` | 긴 워크플로 |
| **명령어** | `.cursor/commands/*.md` | 채팅 `/` 슬래시 명령 |
| **훅** | `.cursor/hooks.json` | 쉘·세션 가드 |
| **대화 이력** | `.specstory/history/` | SpecStory (로컬 전용, Git 제외) |

## 규칙 (Rules)

| 파일 | 적용 |
|------|------|
| `resume-pilot-project.mdc` | 항상 — 프로젝트 정체성 |
| `secrets-handling.mdc` | 항상 — 키·`.env` 금지 |
| `specstory-commit.mdc` | 항상 — SpecStory Git 제외 |
| `git-commit-ko.mdc` | 항상 — 커밋 메시지 한글 |
| `resume-pilot-backend.mdc` | `resume-api/src/main/java/**` |
| `resume-pilot-frontend.mdc` | `resume-web/**`, `resume-admin/**` |
| `resume-pilot-ai.mdc` | AI Python 서비스 3개 |

## 슬래시 명령 (`/`)

| 명령 | 설명 |
|------|------|
| `/e2e-check` | Phase 1~5 E2E 시나리오 |
| `/api-smoke` | 빌드·API·AI docs 스모크 |
| `/deploy-smoke` | Ubuntu 배포 확인 (`설치-가이드.md` Part 3) |
| `/handoff` | SpecStory·세션 이어가기 |

## 스킬

- `api-smoke` — 빌드·API 스모크
- `deploy-smoke` — 서버 배포·health

## 훅

- **sessionStart** — 프로젝트 맥락 한 줄 주입
- **beforeShellExecution** — force push·`.env` git add 경고

## SpecStory

로컬 전용 (Git 제외). PC 전환: `git add .cursor .claude` → commit → push. 이어가기: `/handoff` (로컬 `.specstory/history/` 참조)
