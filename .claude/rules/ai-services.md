---
paths:
  - "resume-ai/**/*.py"
  - "prompt-service/**/*.py"
  - "rag-service/**/*.py"
---

# AI Services (FastAPI)

| 서비스 | 포트 | 역할 |
|--------|------|------|
| resume-ai | 8000 | AI Gateway — 생성·첨삭·흔적·면접 |
| prompt-service | 8001 | 프롬프트 템플릿 런타임 |
| rag-service | 8002 | 임베딩·벡터 검색 |

- 설정: 각 `app/config.py` — `DATABASE_URL`, `OPENAI_API_KEY` 등
- DB: asyncpg pool, resume-api Flyway 스키마 공유
- LLM: `OPENAI_API_KEY` + `OPENAI_BASE_URL` (Gemini 호환 OpenAI API)

변경 후 해당 서비스에서 `uvicorn app.main:app --reload --port <port>` 또는 pytest.
