# ResumePilot

RAG 기반 기업 맞춤 자기소개서 작성 및 첨삭 플랫폼

## 서비스 구조

### 로컬 개발 (터미널)

| 서비스 | 포트 | 설명 |
|--------|------|------|
| PostgreSQL | 5432 | `docker run` pgvector |
| app (Spring) | 8080 | `gradlew bootRun` |
| resume-web (Vite) | 5173 | `npm run dev` |
| resume-admin (Vite) | 5174 | `npm run dev` (`/admin/`) |
| resume-ai | 8000 | uvicorn |
| prompt-service | 8001 | uvicorn |
| rag-service | 8002 | uvicorn |

### 프로덕션 (Docker 5컨테이너)

| 서비스 | 호스트 포트 | 설명 |
|--------|-------------|------|
| **app** | 9180 (서버) | SPA `/` + `/admin/` + API |
| postgres | 55532 (선택) | pgvector |
| AI 3개 | (내부) | Docker network only |

Named Tunnel origin: `http://127.0.0.1:APP_PORT` 하나.

## 빠른 시작

**실행 가이드: [docs/RUNNING.md](docs/RUNNING.md)**

```powershell
# 로컬 개발
copy .env.example .env
.\scripts\resume-pilot.ps1 setup
.\scripts\resume-pilot.ps1 db

# 배포 (Linux 서버)
cp .env.production.example .env
./scripts/resume-pilot.sh deploy

# 로컬 prod 스모크
.\scripts\local-prod-up.ps1
```

## 환경 변수

| 파일 | 용도 |
|------|------|
| `.env.example` | 로컬 터미널 개발 |
| `.env.production.example` | Docker 배포 |

| 변수 | 설명 |
|------|------|
| `JWT_SECRET` | JWT 서명 키 (변경 필수) |
| `OPENAI_API_KEY` | LLM API 키 (Gemini 등) |
| `VITE_API_URL` | 프론트 → API (`http://localhost:8080`) |

## API 문서

- Swagger: http://localhost:8080/swagger-ui.html
- resume-ai: http://localhost:8000/docs

## 아키텍처

[docs/architecture.md](docs/architecture.md)

## Linux 서버 배포

[docs/SETUP.md](docs/SETUP.md#part-3-ubuntu-서버) — `DEPLOY_HOST`는 로컬 `.env`에만 설정.

```powershell
.\scripts\deploy-remote.ps1
```

[docs/deployment.md](docs/deployment.md) · [docs/server-coexistence.md](docs/server-coexistence.md)

## 라이선스

Private
