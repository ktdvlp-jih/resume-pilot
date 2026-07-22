# AI Agent Skills 정책 (Cursor + Claude Code)

## 목적

외부(Vercel, ibelick 등) Agent Skills는 각 PC에서 `npx skills add`로 설치하고, 프로젝트 맞춤 **커스텀 Skill은 에이전트가 직접 읽는 폴더에 커밋**해서 `git pull`만으로 항상 인식되게 합니다.

모든 명령은 프로젝트 루트에서 PowerShell로 실행합니다.

```powershell
cd e:\workspace\resume-pilot
```

에이전트 ID:

- Cursor: `cursor`
- Claude Code: `claude-code`

---

## 한눈에 보기

| 구분 | 스킬 | Git | PC에서 할 일 |
|------|------|-----|--------------|
| 커스텀 | `api-smoke`, `deploy-smoke` | ✅ `.claude/skills/`·`.cursor/skills/`에 커밋 | `git pull`만. **설치·링크 불필요** |
| 외부 | Vercel / ibelick / shadcn 등 | ❌ 무시 | PC마다 섹션 B 실행 |

> **2026-07-22 개정:** 이전에는 커스텀 스킬을 `.agents/skills/`에 커밋하고 각 PC에서 링크했으나, 링크가 Git에 남지 않아 clone 직후 어떤 에이전트도 스킬을 인식하지 못했다. 이제 커스텀 스킬은 에이전트가 읽는 위치에 실파일로 커밋한다.

`.gitignore` 구조:

- `.agents/skills/**` — npx 다운로드 원본, 전체 무시
- `.cursor/skills/*`, `.claude/skills/*` — 무시하되 `api-smoke/`·`deploy-smoke/`만 예외 커밋

---

## A. 커스텀 스킬 (Git 관리 — 설치 불필요)

소스(= 에이전트가 읽는 위치, 커밋됨):

- `.claude/skills/api-smoke/SKILL.md`, `.claude/skills/deploy-smoke/SKILL.md`
- `.cursor/skills/api-smoke/SKILL.md`, `.cursor/skills/deploy-smoke/SKILL.md`

**수정 시 `.claude/skills/`와 `.cursor/skills/` 양쪽을 동일하게 수정**하고 커밋합니다.

### A-1) 저장소에서 받기

```powershell
git pull
```

이후 Cursor·Claude Code 재시작만 하면 두 에이전트 모두 인식합니다. (별도 링크 명령 없음)

### A-2) 실행 방법 (설치가 아님 — 채팅에 붙여넣기)

**API·빌드 스모크**

```text
api-smoke 스킬로 로컬 빌드·API 스모크 해줘
```

**배포 스모크**

```text
deploy-smoke 스킬로 서버 컨테이너·헬스 확인해줘
```

또는 슬래시: `/api-smoke`, `/deploy-smoke`

---

## B. 외부 스킬 설치 (PC마다, 위에서 아래 순서)

`-a cursor -a claude-code` → 둘 다 등록. `-y` → 확인 생략.

최신 skills CLI 동작: `.agents/skills/`에 원본을 받고, **Cursor는 `.agents/skills/`를 직접 읽으며**(universal), **Claude Code용으로는 `.claude/skills/`에 Junction**을 만듭니다.

### B-0) 설치 전 상태 확인

```powershell
npx skills ls -a cursor
npx skills ls -a claude-code
```

### B-1) Vercel React·디자인 (표준)

```powershell
npx -y skills add vercel-labs/agent-skills `
  -a cursor -a claude-code `
  --skill vercel-react-best-practices `
  --skill vercel-composition-patterns `
  --skill web-design-guidelines `
  -y
```

### B-2) UI 개선 — ibelick (표준)

```powershell
npx -y skills add ibelick/ui-skills -a cursor -a claude-code `
  --skill ui-skills-root `
  --skill improve-ui `
  --skill fixing-accessibility `
  --skill baseline-ui `
  -y
```

### B-3) Find Skills — 스킬 검색 (표준)

```powershell
npx -y skills add vercel-labs/skills --skill find-skills -a cursor -a claude-code -y
```

### B-4) shadcn/ui (옵션)

```powershell
npx -y skills add shadcn/ui --skill shadcn -a cursor -a claude-code -y
```

### B-5) Code Review Expert (옵션)

```powershell
npx -y skills add sanyuan0704/code-review-expert --skill code-review-expert -a cursor -a claude-code -y
```

### B-6) Cloudflare / Tunnel (옵션 — 문서·참고용)

```powershell
npx -y skills add cloudflare/skills -a cursor -a claude-code --skill cloudflare-one -y
```

### B-7) 설치 후 재확인

```powershell
npx skills ls -a claude-code
Get-ChildItem .claude\skills   # api-smoke·deploy-smoke(실폴더) + 외부 스킬 Junction
```

Claude Code 세션을 재시작하면 스킬 목록에 반영됩니다.

---

## 설치하지 않는 스킬

ResumePilot은 **Docker 5컨테이너 배포**(Vercel 아님)·웹 전용이므로 아래는 설치하지 않습니다. 에이전트가 잘못된 배포 경로·플랫폼 가이드를 주는 것을 막기 위함:

- `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` — Vercel 배포 전용
- `vercel-react-native-skills` — React Native 전용

## C. 기타 옵션 스킬 (필요할 때만)

- `vercel-labs/agent-skills` → `vercel-react-view-transitions` (페이지 전환 애니메이션)
- `anthropics/skills` — UI/문서/리뷰 등
- `supabase/agent-skills`, `redis/agent-skills` — 해당 스택 사용 시

검색: `npx skills find` 또는 채팅에서 find-skills 스킬 사용.

---

## PC 전환 체크리스트

1. `git pull` → 커스텀 2개는 즉시 인식 (Cursor·Claude Code 재시작)
2. 섹션 **B-1 ~ B-3** 실행 → 표준 외부 스킬 설치
3. `npx skills ls -a claude-code`로 확인
4. 스모크가 필요하면 채팅에 **A-2** 문장 붙여넣기

---

## 참고

- `.agents/skills/`와 `.claude/skills/`의 Junction은 생성물이라 커밋하지 않습니다. 사라지면 섹션 B로 재현합니다.
- 커스텀 스킬 내용 변경은 `.claude/skills/`·`.cursor/skills/`의 SKILL.md를 직접 수정해 커밋합니다. (`.agents/`에는 커스텀 스킬이 더 이상 없음)
