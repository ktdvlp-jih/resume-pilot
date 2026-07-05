# 배포 스모크

`deploy-smoke` 스킬을 따른다.

1. `@docs/SETUP.md#part-3-ubuntu-서버` 기준
2. SSH는 로컬 `.env`의 `DEPLOY_HOST` (Git 제외)
3. 서버에서 `docker compose ps` — 5컨테이너 Up
4. `curl http://localhost:${APP_PORT:-9180}/` · `/admin/` · `/swagger-ui.html`
5. Named Tunnel origin: `http://127.0.0.1:9180`

비밀·IP·토큰 출력 금지.
