# ResumePilot 인프라

> **정본:** [`docker-compose.yml`](../docker-compose.yml), [`resume-api/Dockerfile.prod`](../resume-api/Dockerfile.prod)  
> **설치·배포:** [SETUP.md](SETUP.md#part-3-ubuntu-서버) · **실행:** [RUNNING.md](RUNNING.md)

프로덕션(Ubuntu Docker)은 **컨테이너 5개** + **호스트 Cloudflare Tunnel(선택)** 로 동작합니다.  
브라우저·Named Tunnel은 **`APP_PORT`(기본 9180) 하나**만 보면 됩니다.

---

## 1. 전체 그림

```
[인터넷 / 브라우저 / Tunnel]
        │
        ├─ https://your-domain.com  ── Cloudflare Named Tunnel (systemd, Docker 밖)
        ├─ http://<LAN_HOST>:9180   ── LAN
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Ubuntu 서버                                             │
│                                                         │
│  cloudflared (systemd) ──► localhost:9180               │
│                                                         │
│  ┌─────────── Docker Compose (resume-pilot) ──────────┐  │
│  │                                                   │  │
│  │  resume-pilot-app (:8080 내부 → APP_PORT 호스트)   │  │
│  │    · Spring Boot API (/api/v1/**)                 │  │
│  │    · SPA 사용자 UI (/)                             │  │
│  │    · SPA 관리자 (/admin/)                          │  │
│  │                                                   │  │
│  │  resume-pilot-postgres (pgvector/pg17)            │  │
│  │    · POSTGRES_PORT 호스트 (기본 55532, 선택)       │  │
│  │                                                   │  │
│  │  resume-pilot-ai (:8000, 내부만)                  │  │
│  │  resume-pilot-prompt (:8001, 내부만)              │  │
│  │  resume-pilot-rag (:8002, 내부만)                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**로컬 개발**은 Docker 5개가 아니라 **터미널**에서 서비스별 실행 — [RUNNING.md §1](RUNNING.md#1-로컬-개발-터미널).

---

## 2. 프로덕션 컨테이너 (5개)

| 서비스 | 컨테이너명 | 이미지/빌드 | 역할 |
|--------|------------|-------------|------|
| `postgres` | `resume-pilot-postgres` | `pgvector/pgvector:pg17` | PostgreSQL + 벡터 검색 |
| `app` | `resume-pilot-app` | `resume-api/Dockerfile.prod` | Spring API + **내장 SPA** (/, /admin/) |
| `resume-ai` | `resume-pilot-ai` | `./resume-ai` | AI Gateway |
| `prompt-service` | `resume-pilot-prompt` | `./prompt-service` | 프롬프트 런타임 |
| `rag-service` | `resume-pilot-rag` | `./rag-service` | 임베딩·RAG |

`COMPOSE_PROJECT_NAME=resume-pilot` — 네트워크·볼륨 접두사 분리.

---

## 3. 호스트 포트 (프로덕션)

| 역할 | 환경 변수 | 기본값 | 공개 |
|------|-----------|--------|------|
| App (SPA + API) | `APP_PORT` | `9180` | ✅ Tunnel / LAN |
| PostgreSQL | `POSTGRES_PORT` | `55532` | 선택 (DBeaver) |
| resume-ai | — | (내부) | ❌ |
| prompt-service | — | (내부) | ❌ |
| rag-service | — | (내부) | ❌ |

같은 서버에 다른 Docker 스택이 있으면 **호스트 포트가 겹치지 않게** `.env`에서 조정 — [server-coexistence.md](server-coexistence.md).

---

## 4. SPA-in-JAR (단일 app)

Prod `app` 컨테이너는 빌드 시:

1. `resume-web` → Vite build → `classpath:/static/`
2. `resume-admin` → Vite build (`base: /admin/`) → `classpath:/static/admin/`
3. Spring Boot JAR — `SPRING_PROFILES_ACTIVE=prod`, `app.spa.enabled=true`

브라우저는 **한 포트**에서 `/`, `/admin/`, `/api/v1` 모두 접근 (same-origin).

Named Tunnel origin:

```text
http://127.0.0.1:9180
```

---

## 5. 내부 통신

```
Browser → app:8080
    → /api/v1/**     → Spring
    → resume-ai:8000 → prompt-service:8001
                    → rag-service:8002
    → postgres:5432  (JDBC + Python DATABASE_URL)
```

컨테이너 간 URL (`.env.production.example`):

- `RESUME_AI_SERVICE_URL=http://resume-ai:8000`
- `PROMPT_SERVICE_URL=http://prompt-service:8001`
- `RAG_SERVICE_URL=http://rag-service:8002`

---

## 6. 볼륨·데이터

| 볼륨 | 용도 |
|------|------|
| `resume-pilot_postgres_data` | PostgreSQL 데이터 영구 저장 |

`docker compose down`은 컨테이너만 제거. **볼륨을 지우지 않으면** DB 유지.

Flyway 마이그레이션: **resume-api**만 소유 (`db/migration/`).

---

## 7. 설정 파일

| 파일 | 역할 |
|------|------|
| [`docker-compose.yml`](../docker-compose.yml) | prod 5서비스 정의 |
| [`.env`](../.env) | 실값 (Git 제외) |
| [`.env.production.example`](../.env.production.example) | 서버 템플릿 |
| [`.env.example`](../.env.example) | 로컬 터미널 개발 템플릿 |
| [`resume-api/Dockerfile.prod`](../resume-api/Dockerfile.prod) | app 이미지 (SPA 번들) |

---

## 8. Docker에 올라가지 않는 것 (개발)

| 항목 | 실행 위치 |
|------|-----------|
| Vite dev (5173/5174) | 개발 PC `npm run dev` |
| `gradlew bootRun` | 개발 PC |
| Cloudflare Tunnel | Ubuntu systemd (선택) |

---

## 9. 운영 명령 (Ubuntu)

```bash
cd ~/apps/resume-pilot
docker compose ps
docker compose up -d --build
curl -sf http://localhost:9180/swagger-ui.html -o /dev/null && echo OK
```

```bash
docker compose logs -f app
./scripts/server-down.sh
```

배포: [SETUP.md §3](SETUP.md#part-3-ubuntu-서버) · `./scripts/resume-pilot.sh deploy`

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [architecture.md](architecture.md) | 서비스 책임·디렉터리 |
| [SETUP.md](SETUP.md) | 설치·배포 진입 |
| [RUNNING.md](RUNNING.md) | 로컬 개발·E2E |
| [deployment.md](deployment.md) | 배포 트러블슈팅 |
| [server-coexistence.md](server-coexistence.md) | 동일 서버 포트 격리 |
