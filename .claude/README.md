# ResumePilot — Claude Code 설정

`.cursor/` 설정의 Claude Code 대응본. 두 폴더는 같은 규칙을 담으며, 룰 변경 시 **양쪽을 함께 갱신**한다.

## 구조

| 종류 | 경로 | Cursor 대응 |
|------|------|-------------|
| **프로젝트 메모리** | `../CLAUDE.md` | `rules/resume-pilot-project.mdc` (alwaysApply) |
| **규칙** | `.claude/rules/*.md` | `.cursor/rules/*.mdc` |
| **스킬** | `.claude/skills/*/SKILL.md` | `.cursor/skills/*/SKILL.md` |
| **명령어** | `.claude/commands/*.md` | `.cursor/commands/*.md` |
| **훅** | `.claude/settings.json` + `.claude/hooks/*.js` | `.cursor/hooks.json` + `.cursor/hooks/*.js` |

## 규칙 (rules/)

| 파일 | 적용 |
|------|------|
| `secrets-handling.md` | 항상 — 키·`.env` 금지 |
| `specstory-commit.md` | 항상 — SpecStory Git 제외 |
| `git-commit-ko.md` | 항상 — 커밋 메시지 한글 |
| `backend.md` | `resume-api/src/main/java/**` |
| `frontend.md` | `resume-web/**`, `resume-admin/**` |
| `ai-services.md` | AI Python 서비스 3개 |

## 슬래시 명령 (`/`)

| 명령 | 출처 | 설명 |
|------|------|------|
| `/api-smoke` | skills | 빌드·API·AI docs 스모크 |
| `/deploy-smoke` | skills | Ubuntu 배포 확인 |
| `/e2e-check` | commands | Phase 1~5 E2E 시나리오 |
| `/handoff` | commands | SpecStory·세션 이어가기 |

## 훅 (settings.json)

- **SessionStart** — `hooks/session-start.js`: 프로젝트 맥락 한 줄 주입
- **PreToolUse(Bash, git만)** — `hooks/guard-shell.js`: main/master force push 차단, `.env` git add·`git reset --hard` 확인 요청

훅·설정 변경 후에는 Claude Code 재시작(또는 `/hooks` 열기)으로 반영.

## SpecStory

PC 전환: `git add .specstory .cursor .claude` → commit → push. 이어가기: `/handoff`
