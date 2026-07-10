# API 규약

## Base URL

```
http://localhost:8080/api/v1
```

## Response Format

All API responses use a unified wrapper:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-07-05T12:00:00Z"
}
```

Error response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed"
  },
  "timestamp": "2026-07-05T12:00:00Z"
}
```

## Authentication

```
Authorization: Bearer <access_token>
```

### Auth Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | No | Register |
| POST | `/auth/login` | No | Login |
| POST | `/auth/refresh` | No | Refresh tokens |
| PATCH | `/auth/password` | Yes | Change password |

## Domain Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get profile |
| PATCH | `/users/me` | Update profile |
| CRUD | `/resumes` | Cover letter management |
| POST | `/resumes/{id}/versions` | Create version |
| GET | `/resumes/{id}/versions` | List versions |
| GET | `/resumes/{id}/versions/compare` | Compare versions |
| CRUD | `/experiences` | Experience library |
| POST | `/experiences/{id}/embed` | Trigger RAG embedding |
| CRUD | `/job-postings` | Job posting management |
| POST | `/job-postings/upload` | Upload posting (text/URL) |
| POST | `/job-postings/upload/file` | Upload posting file (PDF/image, multipart) |
| GET | `/job-postings/{id}/analysis` | Get analysis result |
| POST | `/job-postings/{id}/reanalyze` | Re-run analysis |
| GET | `/companies`, `/companies/{id}` | Company list/detail |
| GET | `/writing-styles/me` | My writing style |
| POST | `/writing-styles/analyze` | Analyze writing style |
| POST | `/rag/search` | RAG semantic search |
| POST | `/rag/recommend-experiences` | Recommend experiences for posting |
| POST | `/ai/generate` | AI generation |
| POST | `/ai/detect` | AI trace detection |
| POST | `/ai/review` | Paragraph-level review |
| POST | `/ai/interview-questions` | Interview question generation |
| POST | `/ai/compare-keywords` | Posting↔resume keyword comparison |
| GET | `/ai/generations` | My generation history |

## Admin Endpoints

All under `/admin/**`, requires `ROLE_ADMIN`.

| Path | Description |
|------|-------------|
| `/admin/prompts` (+ `/{templateId}/versions`, `/versions/{versionId}/activate`, `/test`) | Prompt management |
| `/admin/forbidden-expressions` | Forbidden expressions |
| `/admin/users` (+ `/{id}/role`, `/{id}/enabled`) | User management |
| `/admin/companies` | Company management |
| `/admin/ai-logs` | AI usage logs |
| `/admin/llm/providers`, `/admin/llm/routes` | LLM provider keys & per-task model routes (failover) |
| `/admin/deploy-ci-settings` | Deploy CI toggle settings |

## Internal Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/llm/runtime-config` | LLM runtime route config for Python services (`INTERNAL_API_TOKEN` auth) |

## Python Services

Each FastAPI service exposes:
- `GET /health` — Health check
- `GET /docs` — Swagger UI

### resume-ai (8000)

- `POST /analyze/job-posting`
- `POST /analyze/writing-style`
- `POST /generate/resume`
- `POST /detect/ai-traces`
- `POST /review/feedback`
- `POST /generate/interview-questions`
- `POST /compare/keywords`

### prompt-service (8001)

- `GET /prompts/{type}`
- `GET /prompts/{type}/versions`
- `POST /prompts/render`
- `POST /prompts/test`

### rag-service (8002)

- `POST /embeddings`
- `POST /search`
- `POST /context/build`

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| INVALID_INPUT | 400 | Validation error |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Access denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate resource |
| EMAIL_ALREADY_EXISTS | 409 | Email taken |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| INVALID_TOKEN | 401 | Expired/invalid token |

## Versioning

All REST endpoints are prefixed with `/api/v1/`.
