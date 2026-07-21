# SpecStory · 로컬 전용 (Git 제외)

ResumePilot의 SpecStory 대화 기록(`.specstory/`)은 **Git에 커밋하지 않습니다.**  
대화에 API 키·토큰이 섞일 수 있어 GitHub Push Protection에 걸릴 수 있습니다.

## 에이전트 (필수)

1. **커밋 요청 시** — `.specstory/` 변경은 **스테이징하지 않는다.**
2. **푸시 요청 시** — `.specstory/`는 push 대상이 아니다.
3. **커밋 대상**
   - ✅ `.cursor/`, `.claude/` (룰·명령·스킬 변경 시)
   - ❌ `.specstory/` 전체 (`.gitignore`)
   - ❌ `.env`, PAT, SSH 키 (`secrets-handling.md`)

## PC 전환

SpecStory는 PC마다 로컬에 남습니다. 다른 PC에서 맥락이 필요하면 `@.specstory/history/` 또는 `/handoff`로 **로컬 파일**을 참조합니다.

```powershell
git pull
# … 작업 …
git add .cursor .claude   # .specstory 는 add 하지 않음
git commit -m "feat: …"
git push
```

상세: `docs/설치-가이드.md` Part 4 (PC 전환)
