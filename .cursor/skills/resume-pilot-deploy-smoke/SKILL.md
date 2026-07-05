---
name: resume-pilot-deploy-smoke
description: Ubuntu Docker deploy smoke for ResumePilot. Use for server health, 5-container check, tunnel verification.
---

# ResumePilot 배포 스모크

## 참조

- `@docs/SETUP.md#part-3-ubuntu-서버`
- `@docs/server-coexistence.md`

## 서버 (SSH)

로컬 `.env`의 `DEPLOY_HOST`로 접속 (IP는 Git·채팅에 노출하지 않음).

```bash
cd ~/apps/resume-pilot
docker compose ps
APP_PORT=${APP_PORT:-9180}
curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/admin/"
curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/swagger-ui.html"
```

## 기대 상태

| 컨테이너 | 포트 (host) |
|----------|-------------|
| resume-pilot-app | `APP_PORT` (9180) |
| resume-pilot-postgres | `POSTGRES_PORT` (55532) |
| resume-ai / prompt / rag | internal only |

## 배포

```powershell
# .env 에 DEPLOY_HOST 설정 후
.\scripts\deploy-remote.ps1
```

서버: `./scripts/server-up.sh`

## 보고 형식

| 항목 | 상태 | 비고 |
|------|------|------|
| Docker 5개 | | |
| `/` SPA | | 200 |
| `/admin/` | | 200 |
| Swagger | | 200 |
