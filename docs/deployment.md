# Linux Server Deployment

서버 SSH·LAN 주소는 **Git에 넣지 않는다**. 로컬 `.env`의 `DEPLOY_HOST`, `LAN_HOST` 사용.

**진입 문서:** [SETUP.md § Part 3](SETUP.md#part-3-ubuntu-서버)

## Target

| Item | Value |
|------|-------|
| SSH | `DEPLOY_HOST` in local `.env` (e.g. `user@your-lan-host`) |
| Path | `~/apps/resume-pilot` |
| OS | Ubuntu 22.04 |

## Quick deploy

```powershell
# Windows — DEPLOY_HOST in .env first
.\scripts\deploy-remote.ps1
```

```bash
export DEPLOY_HOST=user@your-lan-host
./scripts/deploy-remote.sh
```

## Manual on server

```bash
cd ~/apps/resume-pilot
cp .env.production.example .env
# Edit .env: POSTGRES_PASSWORD, JWT_SECRET, OPENAI_API_KEY, LAN_HOST
./scripts/server-up.sh
```

## Service URLs

`http://<LAN_HOST>:<APP_PORT>/` — defaults `APP_PORT=9180`

| Service | Path |
|---------|------|
| Web (SPA) | `/` |
| Admin (SPA) | `/admin/` |
| API | `/api/v1` |
| Swagger | `/swagger-ui.html` |

**Named Tunnel:** `http://127.0.0.1:9180`

Co-located stacks: [server-coexistence.md](server-coexistence.md)

## Production compose

```bash
docker compose up -d --build
```

5 containers: app, postgres, resume-ai, prompt-service, rag-service

## GitHub Actions (auto deploy)

`master` 브랜치 push 시 Ubuntu **self-hosted runner**가 배포합니다.

- Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- Runner 경로: `/home/jeon/apps/resume-pilot`
- 동시 실행: `concurrency: deploy-ubuntu` (진행 중 배포 취소)

### 파이프라인 (3단계)

| # | Step | 명령 | 검증 |
|---|------|------|------|
| 1 | Sync + Deploy | `git checkout -f origin/master` → `resume-pilot.sh deploy` | Docker 5컨테이너 Up |
| 2 | HTTP + API smoke | `scripts/deploy-smoke.sh` | 12 checks (HTTP 5 + API 7) |
| 3 | E2E smoke | `scripts/deploy-smoke-e2e.sh` | Playwright 4/4 (Docker 이미지) |

**주의:** self-hosted runner 호스트에 **npm 없음** — E2E는 Playwright Docker 컨테이너에서 실행.

### 스모크 스크립트

| 스크립트 | 용도 |
|----------|------|
| `deploy-smoke.sh` | CI·서버 localhost (`SMOKE_BASE_URL` optional) |
| `deploy-smoke-e2e.sh` | CI Playwright (`PLAYWRIGHT_BASE_URL`, lockfile 버전 → Docker tag) |
| `deploy-smoke.ps1` | Windows / Quick Tunnel URL 수동 검증 |

수동 배포: `./scripts/resume-pilot.sh deploy` (스모크는 CI에서만 자동).

현황: [project-status.md](project-status.md) · 장애: [reports/deploy-ci-incidents-2026-07-07.md](reports/deploy-ci-incidents-2026-07-07.md)

## Environment variables

[`.env.production.example`](../.env.production.example) → server `.env`

| Variable | Description |
|----------|-------------|
| `LAN_HOST` | LAN hostname/IP for CORS·docs (not committed in real `.env` on server) |
| `POSTGRES_PASSWORD` | DB password |
| `JWT_SECRET` | JWT signing key |
| `APP_PORT` | Host port (default `9180`) |
| `OPENAI_API_KEY` | LLM API key |

## Useful commands (on server)

```bash
cd ~/apps/resume-pilot
docker compose ps
docker compose logs -f app
./scripts/server-down.sh
docker compose up -d --build app
```

## Firewall (optional)

```bash
sudo ufw allow 9180/tcp
```

## Troubleshooting

See [SETUP.md](SETUP.md) and [RUNNING.md](RUNNING.md).

**SPA routes 404** — `SPRING_PROFILES_ACTIVE=prod`, rebuild app container.

**CORS (local dev only)** — `RESUME_CORS_ORIGINS` with Vite `5173`/`5174`.
