# AI Agent Skills 정책 (Cursor + Claude Code)

## 목적

이 프로젝트는 `npx skills`로 외부 Agent Skills를 **다운로드/링크**하고, 프로젝트 맞춤 **커스텀 Skill은 Git에 커밋**해서 팀/PC 간에 재현 가능한 개발 환경을 유지합니다.

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
| 커스텀 | `api-smoke`, `deploy-smoke` | ✅ 커밋 | `git pull`만. **`npx skills add` 불필요** |
| 외부 | Vercel / shadcn / Cloudflare 등 | ❌ 무시 | PC마다 아래 설치 순서 실행 |

> `.gitignore`: `.agents/skills/**` 대부분 무시, 커스텀 2개만 예외 추적.  
> `.cursor/skills/`, `.claude/skills/`는 생성물(링크)이라 커밋하지 않음.

---

## A. 커스텀 스킬 (Git 관리 — 설치 불필요)

소스:

- `.agents/skills/api-smoke/SKILL.md`
- `.agents/skills/deploy-smoke/SKILL.md`

### A-1) 저장소에서 받기

```powershell
git pull
```

### A-2) Cursor에서 인식 확인

```powershell
npx skills ls -a cursor
```

`api-smoke`, `deploy-smoke`가 보이고 `Agents: Cursor`이면 준비 완료입니다.

### A-3) Claude Code까지 쓸 때만 (선택 — `not linked`일 때)

```powershell
New-Item -ItemType Directory -Force -Path .claude\skills | Out-Null
cmd /c mklink /J ".claude\skills\api-smoke" ".agents\skills\api-smoke"
cmd /c mklink /J ".claude\skills\deploy-smoke" ".agents\skills\deploy-smoke"
npx skills ls -a claude-code
```

### A-4) 실행 방법 (설치가 아님 — 채팅에 붙여넣기)

에이전트 채팅에 아래를 요청하면 스킬 절차대로 동작합니다.

**API·빌드 스모크**

```text
api-smoke 스킬로 로컬 빌드·API 스모크 해줘
```

**배포 스모크**

```text
deploy-smoke 스킬로 서버 컨테이너·헬스 확인해줘
```

또는 Cursor 슬래시: `/api-smoke`, `/deploy-smoke`

---

## B. 외부 스킬 설치 (PC마다, 위에서 아래 순서)

`-a cursor -a claude-code` → 둘 다 링크. `-y` → 확인 생략.

### B-0) 설치 전 상태 확인

```powershell
npx skills ls -a cursor
npx skills ls -a claude-code
```

### B-1) Vercel React Best Practices

```powershell
npx skills add vercel-labs/agent-skills `
  -a cursor -a claude-code `
  --skill vercel-react-best-practices `
  --skill vercel-composition-patterns `
  --skill web-design-guidelines `
  -y
```

### B-2) Find Skills (스킬 검색)

```powershell
npx skills add vercel-labs/skills --skill find-skills -a cursor -a claude-code -y
```

### B-3) UI 개선 (ibelick)

```powershell
npx skills add ibelick/ui-skills -a cursor -a claude-code `
  --skill ui-skills-root `
  --skill improve-ui `
  --skill fixing-accessibility `
  --skill baseline-ui `
  -y
```

### B-4) shadcn/ui

```powershell
npx skills add shadcn/ui --skill shadcn -a cursor -a claude-code -y
```

### B-5) Code Review Expert

```powershell
npx skills add sanyuan0704/code-review-expert --skill code-review-expert -a cursor -a claude-code -y
```

### B-6) Cloudflare / Tunnel (문서·참고용)

```powershell
npx skills add cloudflare/skills -a cursor -a claude-code --skill cloudflare-one -y
```

### B-7) 설치 후 재확인

```powershell
npx skills ls -a cursor
npx skills ls -a claude-code
```

기대 예: `vercel-react-best-practices`, `find-skills`, `improve-ui`, `shadcn`, `code-review-expert`, `cloudflare-one` 등이 `Agents: Cursor, Claude Code`로 표시.

---

## C. 기타 옵션 스킬 (필요할 때만)

문서에 나열만 하고, 스택에 맞을 때 설치합니다.

- `anthropics/skills` — UI/문서/리뷰 등
- `remotion-dev/skills` — Remotion 사용 시
- `supabase/agent-skills`, `redis/agent-skills` — 해당 스택 사용 시

예:

```powershell
npx skills find
```

---

## PC 전환 체크리스트

1. `git pull` → 커스텀 2개 자동 반영
2. 섹션 **B-0 ~ B-7** 실행 → 외부 스킬 재설치
3. Claude Code를 쓰면 **A-3**으로 커스텀 링크
4. 스모크가 필요하면 채팅에 **A-4** 문장 붙여넣기

---

## 참고

- `npx skills add`는 `.agents/skills/`에 받고, `.cursor/skills/`·`.claude/skills/`에 심볼릭 링크를 만듭니다.
- 그 링크 경로는 커밋하지 않습니다. 없어지면 섹션 B 커맨드로 다시 재현합니다.
- 커스텀 스킬 내용을 바꿀 때는 `.agents/skills/.../SKILL.md`만 수정하고 Git에 커밋합니다.
