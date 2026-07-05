# ResumePilot SETUP

설치·개발·배포 진입 문서. **서버 IP·SSH 계정은 Git에 넣지 않는다** — 로컬 `.env`의 `DEPLOY_HOST`, `LAN_HOST`에만 둔다.

| 문서 | 용도 |
|------|------|
| [RUNNING.md](RUNNING.md) | 터미널 개발·E2E |
| [deployment.md](deployment.md) | 배포 명령·트러블슈팅 |
| [server-coexistence.md](server-coexistence.md) | 동일 서버 포트 격리 |
| [.cursor/README.md](../.cursor/README.md) | Cursor 슬래시 명령 |

---

## Part 1 — 개요

| 환경 | 방식 | 포트 |
|------|------|------|
| **로컬 개발** | 터미널 (DB만 Docker 가능) | API 8080, Vite 5173/5174 |
| **프로덕션** | `docker-compose.yml` 5컨테이너 | `APP_PORT` (기본 9180) |

Prod: SPA `/` + `/admin/` + API가 **단일 app 포트**에서 서빙됩니다.

---

## Part 2 — 개발 PC (터미널)

```powershell
.\scripts\resume-pilot.ps1 setup    # 1회
.\scripts\resume-pilot.ps1 db       # PostgreSQL Docker
```

```powershell
copy .env.example .env
# OPENAI_API_KEY, JWT_SECRET, DEPLOY_HOST 등 설정
```

상세: [RUNNING.md §1](RUNNING.md#1-로컬-개발-터미널)

---

## Part 3 — Ubuntu 서버 {#part-3-ubuntu-서버}

### 3-1. 로컬 `.env`에 배포 대상 설정 (Git 제외)

로컬 PC의 `.env`에만 추가 (`.env.example` 참고):

```env
DEPLOY_HOST=jeon@your-lan-host
LAN_HOST=your-lan-host
APP_PORT=9180
```

| 변수 | 설명 |
|------|------|
| `DEPLOY_HOST` | SSH 대상 (`user@host`) |
| `LAN_HOST` | 브라우저·CORS용 호스트명/IP (서버 `.env`의 `LAN_HOST`와 동일 권장) |
| `APP_PORT` | ResumePilot 공개 포트 (기본 `9180`) |

### 3-2. 서버 사전 준비 (1회)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
# 재로그인 후
docker compose version
```

배포 경로: `~/apps/resume-pilot`

### 3-3. Windows에서 원격 배포

```powershell
cd e:\workspace\resume-pilot
# .env 에 DEPLOY_HOST 설정 후
.\scripts\deploy-remote.ps1
```

Linux/macOS:

```bash
export DEPLOY_HOST=jeon@your-lan-host
./scripts/deploy-remote.sh
```

### 3-4. 서버 `.env` (프로덕션)

```bash
cd ~/apps/resume-pilot
cp .env.production.example .env
nano .env   # POSTGRES_PASSWORD, JWT_SECRET, OPENAI_API_KEY, LAN_HOST
./scripts/server-up.sh
```

### 3-5. Ubuntu 서버에서 배포 (git pull)

```bash
cd ~/apps/resume-pilot
chmod +x scripts/resume-pilot.sh
./scripts/resume-pilot.sh deploy
```

또는 `./scripts/server-up.sh` (최초 `.env` 생성 포함).

### 3-6. 배포 후 확인 (서버)

```bash
cd ~/apps/resume-pilot
docker compose ps
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${APP_PORT:-9180}/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:${APP_PORT:-9180}/admin/
```

브라우저 (LAN): `http://<LAN_HOST>:<APP_PORT>/`

### 3-7. `.env` 서버로 복사

`deploy-remote`는 `.env`를 업로드하지 않습니다.

```powershell
scp .env ${env:DEPLOY_HOST}:~/apps/resume-pilot/.env
```

### 3-8. Named Tunnel

origin **1개**:

```text
http://127.0.0.1:9180
```

`/`, `/admin/`, `/api/v1` 모두 동일 포트.

동일 서버 포트 격리: [server-coexistence.md](server-coexistence.md)

---

## Part 4 — PC 전환 · SpecStory {#part-4-pc-전환}

```powershell
git pull
# 작업 후
git add .specstory .cursor
git commit -m "docs: SpecStory·Cursor 동기화"
git push
```

Cursor: `/handoff` 또는 `@.specstory/history/` 최신 파일.

---

## Part 5 — Cursor AI {#part-5-cursor-ai}

- 규칙: `.cursor/rules/`
- 슬래시: `/deploy-smoke`, `/api-smoke`, `/e2e-check`, `/handoff`
- 배포 스모크: [SETUP.md Part 3](#part-3-ubuntu-서버) + `deploy-smoke` 스킬

전체: [.cursor/README.md](../.cursor/README.md)

---

## Part 6 — 환경 변수 파일

| 파일 | 위치 | Git |
|------|------|-----|
| `.env.example` | 로컬 터미널 개발 | ✅ |
| `.env.production.example` | 서버 Docker | ✅ |
| `.env` | 실제 값 (`DEPLOY_HOST`, `LAN_HOST` 포함) | ❌ |

서버 URL 예시 (플레이스홀더):

```text
http://<LAN_HOST>:<APP_PORT>/
http://<LAN_HOST>:<APP_PORT>/admin/
http://<LAN_HOST>:<APP_PORT>/api/v1
```
