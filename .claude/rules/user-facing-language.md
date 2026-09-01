---
paths:
  - "resume-web/**"
  - "resume-admin/**"
  - "resume-api/**"
  - "resume-ai/**"
  - "prompt-service/**"
---

# 사용자-facing 언어

사용자 UI·toast·AI `reply`·사용자 노출 API 메시지에는 **쉬운 말만** 쓴다.

- 금지(사용자에게): STAR, RAG, draft, JSON, API, 임베딩, 토큰, LLM, 프롬프트 등
- 대신: 「상황·과제·행동·결과」, 「경험 라이브러리」, 「지금 정리 중인 경험」
- i18n: `resume-web/src/i18n/locales/*.json` 우선
- 프롬프트 Guard에 동일 규칙 (EXPERIENCE_COACH 등)

내부 코드·Admin·문서·에이전트 대화는 예외.

상세: `.cursor/rules/user-facing-language.mdc`
