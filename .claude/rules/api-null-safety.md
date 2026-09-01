---
paths:
  - "resume-web/**/*.ts"
  - "resume-web/**/*.tsx"
  - "resume-api/src/main/java/**/*.java"
  - "e2e/**/*.ts"
  - "scripts/deploy-smoke.sh"
  - "scripts/pre-push-web.sh"
---

# API null 안전성 (ResumePilot)

**원칙:** 「데이터 없음」은 UI에서 `null`이 아니라 **`""` / `[]` / 정규화된 객체**로 다룬다.

## 백엔드

- 응답 DTO: UI 노출 필드는 JSON `null` 금지 → `""`, `List.of()`
- 객체 자체가 없음(미분석 등)만 `data: null` 허용; 객체가 있으면 내부 list는 `[]`
- signup 직후 `/me` coverLetter null 없음 테스트·smoke assert

## 프론트

- `src/lib/api.ts`에서 1회 정규화 (`normalizeCareerPortfolio`, `requestList`, `asArray`)
- React Query: `data: x = []`만으로는 `data: null` 방어 불가 → `asArray(data)`
- spread merge 전 normalize 적용
- 푸시 전 `./scripts/pre-push-web.sh`

## CI

- E2E: 신규 계정 `/portfolio`, `/settings?tab=wallet` 방문
- deploy-smoke: `/me` coverLetter null 검사

## 체크

- 새 필드 추가 시 DTO + api.ts 정규화
- `.length` / `.map` 직전 null은 API 경계에서 제거
