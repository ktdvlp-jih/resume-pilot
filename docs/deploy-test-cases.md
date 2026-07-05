# ResumePilot 배포 테스트 케이스

GitHub Actions `deploy.yml` (master push) 또는 `./scripts/resume-pilot.sh deploy` 실행 후 검증용 체크리스트.

---

## TC-01 — Docker 컨테이너 (5개)

**실행 (서버 SSH)**

```bash
cd ~/apps/resume-pilot
docker compose ps
```

| # | 검증 | 기대 |
|---|------|------|
| 1 | `resume-pilot-app` | Up, `0.0.0.0:9180->8080` |
| 2 | `resume-pilot-postgres` | Up (healthy), `55532->5432` |
| 3 | `resume-pilot-ai` | Up, host 포트 없음 |
| 4 | `resume-pilot-prompt` | Up, host 포트 없음 |
| 5 | `resume-pilot-rag` | Up, host 포트 없음 |

---

## TC-02 — HTTP 엔드포인트 (localhost)

```bash
APP_PORT=${APP_PORT:-9180}
curl -s -o /dev/null -w "root: %{http_code}\n" "http://localhost:${APP_PORT}/"
curl -s -o /dev/null -w "admin: %{http_code}\n" "http://localhost:${APP_PORT}/admin/"
curl -s -o /dev/null -w "swagger: %{http_code}\n" "http://localhost:${APP_PORT}/swagger-ui.html"
curl -s -o /dev/null -w "api: %{http_code}\n" "http://localhost:${APP_PORT}/api/v1/auth/login" -X POST -H "Content-Type: application/json" -d '{}'
```

| # | URL | 기대 HTTP |
|---|-----|-----------|
| 1 | `/` | 200 |
| 2 | `/admin/` | 200 |
| 3 | `/swagger-ui.html` | 200 |
| 4 | `POST /api/v1/auth/login` (빈 body) | 400 (서버 응답 확인용) |

---

## TC-03 — LAN 브라우저 접속

| # | URL | 기대 |
|---|-----|------|
| 1 | `http://<LAN_HOST>:9180/` | 사용자 SPA 로드 |
| 2 | `http://<LAN_HOST>:9180/admin/` | 관리자 SPA 로드 |

---

## TC-04 — GitHub Actions 자동 배포

| # | 검증 | 기대 |
|---|------|------|
| 1 | `master` push 후 Actions run 생성 | Deploy Docker (Ubuntu self-hosted) |
| 2 | Runner `ubuntu-server` | Idle → Running → Idle |
| 3 | Deploy step | `resume-pilot.sh deploy` 성공 (`git pull origin master`) |
| 4 | Health check step | `curl -sf http://localhost:9180/` 성공 (`/actuator/health` 아님) |

---

## TC-05 — 회귀 (선택)

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 회원가입 → 로그인 | JWT 발급 |
| 2 | 이력서 생성 | API 201 |
| 3 | AI 첨삭 요청 | resume-ai 연동 (OPENAI_API_KEY 설정 시) |

---

## 결과 기록

| TC | 날짜 | 결과 (PASS/FAIL) | 비고 |
|----|------|------------------|------|
| TC-01 | | | |
| TC-02 | | | |
| TC-03 | | | |
| TC-04 | | | |
| TC-05 | | | |
