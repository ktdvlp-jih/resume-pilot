# humanizer 스킬 ↔ 제품 윤문 동기화

DaleSeo humanizer가 40패턴에서 41패턴(또는 규칙 변경)으로 올라왔을 때 할 일.

**자동으로 반영되지 않습니다.** Cursor 스킬과 웹 「AI 흔적 다듬기」는 따로 갱신합니다.

| 대상 | 갱신 방법 | 안 하면 |
|------|-----------|---------|
| 이 PC의 Cursor `/humanizer` | 아래 **1. 로컬 스킬** 명령 | 채팅 스킬만 옛 규칙 |
| 웹 버튼 `AI_HUMANIZE` | 아래 **2. 제품 프롬프트** | 사이트 윤문은 옛 40패턴 그대로 |

원본: [DaleSeo/korean-skills](https://github.com/DaleSeo/korean-skills) (`skills/humanizer/`)

설치·PC 전환: [AI-Agent-스킬-정책.md](AI-Agent-스킬-정책.md) B-7  
프롬프트 운영: [관리자-가이드.md](관리자-가이드.md) §3, [프롬프트-작성-원칙.md](프롬프트-작성-원칙.md)

---

## 0. 업데이트가 왔는지

GitHub Releases / `SKILL.md`의 `metadata.version` / 패턴 개수 설명을 본다.

이 PC에 받은 파일:

`.agents/skills/humanizer/SKILL.md`  
`.agents/skills/humanizer/references/`

이 경로는 Git에 안 올라갑니다. `npx skills`로만 받습니다.

---

## 1. 로컬 스킬 (Cursor / Claude Code)

프로젝트 루트에서 직접 명령을 칩니다. 백그라운드 자동 업데이트가 아닙니다.

```bash
# 설치된 스킬에 새 버전이 있는지
npx skills check

# 전부 최신으로
npx skills update
```

humanizer만 다시 받으려면 설치와 같은 명령을 한 번 더 칩니다. `.agents/skills/humanizer/`를 덮어씁니다.

```bash
npx -y skills add https://github.com/DaleSeo/korean-skills --skill humanizer -a cursor -a claude-code -y
```

확인:

```bash
npx skills ls -a cursor
# SKILL.md frontmatter의 version, 패턴 개수 문구
```

Cursor 세션을 한 번 재시작하면 `/humanizer`가 새 파일을 읽습니다.

PC가 여러 대면 **각 PC에서** 같은 명령을 칩니다. `git pull`만으로는 안 따라옵니다.

---

## 2. 웹 서비스 (필수 — 사이트 버튼을 바꾸려면)

로컬 `SKILL.md`를 고쳐도, `npx skills update`만 해도 **사이트는 안 바뀝니다.**

제품은 PostgreSQL `prompt_versions`의 `AI_HUMANIZE` **Skill** 칸을 봅니다. Flyway 시드는 `V71`(v4) → `V75`(v5, 시제 가드만 추가).

### 2-1. 무엇을 옮길지

`SKILL.md` 전체를 붙여 넣지 않습니다. 채팅용 출력 형식·도구 지시가 섞이면 화면 치환이 깨집니다.

옮기는 것:

- 새 패턴 번호·이름·S1/S2/S3
- 고치는 방법 한두 줄
- 페르소나·가드가 바뀌었으면 Guard 칸만 최소 수정

유지하는 것 (Output 칸, 변수):

- JSON: `analysis` + `replacements[{original, revised, reason}]`
- `{{content}}`, `{{sentences}}`
- 사실·수치 보존, 지어내기 금지
- `RESUME_GENERATION` Skill은 비워 둠 (생성과 윤문 분리)

### 2-2. Admin에서 시험 (이 환경 DB)

1. `/admin/prompts` → 타입 `AI_HUMANIZE`
2. **Skill**에 41번째 패턴(및 변경분)을 반영한 요약 붙여 넣기
3. Task/user 문구의 「40패턴」을 「41패턴」으로 맞춤
4. 새 버전 저장 → diff 확인 → 활성 전환
5. 워크스페이스: 초안 생성 → 「AI 흔적 다듬기」→ 치환·리포트가 나오는지
6. AI Logs에서 `AI_HUMANIZE` 성공 여부

### 2-3. Git·다른 환경 (권장)

Admin만 바꾸면 **그 DB에만** 남습니다. 배포 DB·다른 PC 초기화는 Flyway 시드를 따릅니다.

`resume-api/src/main/resources/db/migration/`에 **다음 번호**로 `AI_HUMANIZE` 새 `prompt_versions` INSERT (기존 방식: 직전 버전에서 SELECT 후 skill/task 수정, 이전 버전 `is_active = false`).

- 마이그레이션은 **resume-api만** 소유
- 운영 반영 후 활성 버전 번호 확인

탐지 화면(진단) 축도 맞추려면 `AI_DETECTION` Task를 같은 패턴으로 맞출지 별도 판단. 윤문 버튼만이면 `AI_HUMANIZE`만으로 충분합니다.

---

## 3. 한 줄 순서

1. GitHub에서 변경 확인  
2. `npx skills check` → `update` 또는 humanizer `add` 재실행 (이 PC Cursor)  
3. 새 패턴을 `AI_HUMANIZE` Skill에 요약 이식 (Admin 시험 → Flyway)  
4. 워크스페이스 버튼으로 확인  

1만 하고 3을 빼면 사용자는 계속 40패턴 윤문을 씁니다.
