# AI Agent Skills 정책 (Cursor + Claude Code)

## 목적

이 프로젝트는 `npx skills`로 외부(예: Vercel) Agent Skills를 **다운로드/링크**하고, 프로젝트에 맞춰 만든 **커스텀 Skill은 커밋**해서 팀/PC 간에 재현 가능한 개발 환경을 유지합니다.

## Source of Truth (커밋해야 할 스킬)

다음 스킬은 프로젝트 동작에 직접 필요한 **커스텀**이므로 저장소에 커밋합니다. (기본적으로 `.agents/`에서 소스로 관리)

- `.agents/skills/api-smoke/SKILL.md`
- `.agents/skills/deploy-smoke/SKILL.md`

## 다운로드만 하면 되는 스킬 (커밋하지 않음)

아래 스킬들은 보통 “모범 사례/가이드” 성격이라, 각 PC에서 `npx skills add`로 설치해 쓰는 것을 전제로 합니다.

- `vercel-labs/skills` / `vercel-labs/agent-skills` 계열 (React 성능/UX/리뷰 등)
- `anthropics/skills` (UI/문서/리뷰 등 옵션)
- `ibelick/ui-skills` (shadcn UI 다듬기 옵션)
- `shadcn/ui` (shadcn 컴포넌트 생성/관리 옵션)
- `sanyuan0704/code-review-expert` (코드 리뷰 옵션)
- `cloudflare/skills` (Cloudflare/Tunnel 관련 옵션)
- `remotion-dev/skills` (프로젝트에 Remotion 사용 시)
- `supabase/agent-skills`, `redis/agent-skills` 등 (해당 스택 사용 시)

> `.gitignore`에서 `.agents/` 대부분은 무시하고, 위 “커스텀 Skill 2개”만 예외로 추적합니다.

## 설치/링크 커맨드 예시

### 1) Cursor + Claude Code 둘 다에 링크

에이전트 ID:
- Cursor: `cursor`
- Claude Code: `claude-code`

예시) Vercel React Best Practices 설치:

```powershell
npx skills add vercel-labs/agent-skills `
  -a cursor -a claude-code `
  --skill vercel-react-best-practices `
  --skill vercel-composition-patterns `
  --skill web-design-guidelines `
  -y
```

### 2) Find/검색용 Skill (앱스토어 같은 역할)

```powershell
npx skills add vercel-labs/skills --skill find-skills -a cursor -a claude-code -y
```

### 3) UI 개선(ibelick/ui-skills) 옵션

```powershell
npx skills add ibelick/ui-skills -a cursor -a claude-code `
  --skill ui-skills-root `
  --skill improve-ui `
  --skill fixing-accessibility `
  --skill baseline-ui `
  -y
```

### 4) shadcn/ui (컴포넌트 생성/관리) 옵션

```powershell
npx skills add shadcn/ui --skill shadcn -a cursor -a claude-code -y
```

### 5) Code Review Expert (옵션)

```powershell
npx skills add sanyuan0704/code-review-expert --skill code-review-expert -a cursor -a claude-code -y
```

### 6) Cloudflare/Tunnel (ResumePilot은 Ubuntu 서버에서 cloudflared 사용, 문서 확인용)

```powershell
npx skills add cloudflare/skills -a cursor -a claude-code --skill cloudflare-one -y
```

## 현재 설치 상태 확인

```powershell
npx skills ls -a cursor
npx skills ls -a claude-code
```

## 참고: `.cursor/skills`, `.claude/skills`

`npx skills`는 위 커맨드 실행 시 Cursor/Claude Code에 Skill을 “링크/복사”하기 위해 `.cursor/skills/`, `.claude/skills/`에 파일을 생성할 수 있습니다.

이 경로들은 보통 생성물이라, 원칙적으로 커밋하지 않습니다. (필요하면 위 커맨드로 다시 재현)

