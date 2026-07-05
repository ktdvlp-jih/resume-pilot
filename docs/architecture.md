# ResumePilot Architecture

## Overview

ResumePilot is a RAG-based cover letter writing and review platform with a multi-service monorepo architecture.

## Service Diagram

**Local dev**

```
resume-web (5173)  ──┐
resume-admin (5174) ─┼──> app / resume-api (8080) ──> PostgreSQL 17 + pgvector (5432)
                       │         │
                       │         └──> resume-ai (8000)
                       │                   ├── prompt-service (8001)
                       │                   └── rag-service (8002)
```

**Production (single port)**

```
Browser ──> app (9180): SPA / + /admin + /api/v1
                ├──> resume-ai (internal)
                │         ├── prompt-service
                │         └── rag-service
                └──> PostgreSQL
```

## Service Responsibilities

| Service | Stack | Role |
|---------|-------|------|
| resume-api | Spring Boot 3.4, Java 21 | JWT auth, domain CRUD, AI orchestration, Flyway migrations |
| resume-ai | FastAPI | AI gateway: generation, detection, review, interview questions |
| prompt-service | FastAPI | Prompt template runtime (render, version, test) |
| rag-service | FastAPI | Embedding, vector search, context assembly |
| resume-web | React 19, Vite, Tailwind | User-facing UI |
| resume-admin | React 19, Vite, Tailwind | Admin UI |

## Data Strategy

- Single shared PostgreSQL database
- Flyway migrations owned exclusively by **resume-api**
- Python services read/write the same schema under contract

## Security

- JWT Access Token (15 min) + Refresh Token (7 days, stored in DB)
- Admin routes protected with `@PreAuthorize("hasRole('ADMIN')")`
- OAuth extension points reserved in `users` table

## Key Business Rules

1. AI must never invent user experiences
2. All prompts loaded via prompt-service (no hardcoding)
3. All AI calls logged to `ai_usage_logs`
4. OpenAI key optional — rule-based fallback when absent

## Directory Structure

```
resume-pilot/
├── resume-api/       # Spring Boot backend
├── resume-ai/        # AI gateway
├── prompt-service/   # Prompt runtime
├── rag-service/      # Vector search
├── resume-web/       # User frontend
├── resume-admin/     # Admin frontend
├── docs/             # Documentation
└── docker-compose.yml
```

## Local Development

터미널에서 각 서비스 실행 — [RUNNING.md](RUNNING.md).

```bash
cp .env.example .env
# PostgreSQL + API + AI 3 + Vite — see RUNNING.md
```

Prod Docker: [SETUP.md](SETUP.md#part-3-ubuntu-서버).
