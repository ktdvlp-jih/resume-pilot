#!/usr/bin/env bash
# ResumePilot — Linux/macOS 통합 스크립트
# Usage:
#   ./scripts/resume-pilot.sh help
#   ./scripts/resume-pilot.sh deploy       # Ubuntu: git pull + docker compose + health
#   ./scripts/resume-pilot.sh tunnel [IP] # dev PC: SSH DB tunnel localhost:55532
#   ./scripts/resume-pilot.sh db           # 로컬 Docker Postgres만 기동

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CMD="${1:-help}"
shift || true

usage() {
  cat <<'EOF'
ResumePilot scripts (Linux/macOS)

  ./scripts/resume-pilot.sh deploy          Ubuntu 배포 (git pull + compose + health)
  ./scripts/resume-pilot.sh tunnel [IP]   DB SSH 터널 localhost:55532 (창 유지)
  ./scripts/resume-pilot.sh db              로컬 dev PostgreSQL (localhost:5432)

DB 스키마: resume-api/src/main/resources/db/migration/ (Flyway, prod)
배포 시 AI 3개(resume-ai, prompt-service, rag-service)는 compose 에 포함 — 별도 명령 없음
로컬 dev: 터미널에서 uvicorn 3개 (8002/8001/8000) — docs/RUNNING.md
상세: docs/SETUP.md#part-3-ubuntu-서버
EOF
}

cmd_deploy() {
  STATUS_FILE="$ROOT/.deploy-status.json"
  LOG_FILE="$ROOT/.deploy-last.log"

  write_status() {
    printf '{"status":"%s","exitCode":%s,"message":"%s","updatedAt":"%s"}\n' \
      "$1" "${2:-0}" "${3:-}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS_FILE"
  }

  wait_health() {
    local url="${1:-http://localhost:9180/actuator/health}"
    local deadline=$((SECONDS + 120))
    local attempt=0
    while (( SECONDS < deadline )); do
      attempt=$((attempt + 1))
      if curl -sf --max-time 15 "$url" >/dev/null 2>&1; then
        echo "[ok] Health check passed (attempt $attempt)"
        return 0
      fi
      echo "[wait] App starting... attempt $attempt"
      sleep 5
    done
    return 1
  }

  write_status running 0 "deploy started"
  exec > >(tee -a "$LOG_FILE") 2>&1

  echo "=== ResumePilot deploy ==="
  echo "[1/3] git pull origin master"
  git pull origin master
  echo "[2/3] docker compose build"
  docker compose build
  echo "[3/3] docker compose up -d"
  docker compose up -d
  docker compose ps

  echo "[4/4] Waiting for health..."
  if wait_health; then
    write_status success 0 "deploy completed"
    exit 0
  fi
  write_status failed 1 "health check failed"
  exit 1
}

cmd_tunnel() {
  local ip="${1:-100.x.x.x}"
  local user="${SSH_USER:-jeon}"
  echo "=== ResumePilot DB tunnel (Tailscale) ==="
  echo "User: ${user}@${ip}"
  echo "Forward: localhost:55532 -> ${ip}:55532"
  echo ".env: jdbc:postgresql://localhost:55532/resumepilot"
  echo "Keep this window open."
  exec ssh -L 55532:localhost:55532 "${user}@${ip}"
}

cmd_db() {
  echo "=== ResumePilot local dev DB (localhost:5432) ==="
  if docker start resume-pilot-db 2>/dev/null; then
    echo "[ok] Started resume-pilot-db"
  else
    docker run -d --name resume-pilot-db -p 5432:5432 \
      -e POSTGRES_DB=resumepilot \
      -e POSTGRES_USER=resumepilot \
      -e POSTGRES_PASSWORD=resumepilot \
      pgvector/pgvector:pg17
    echo "[ok] Created resume-pilot-db"
  fi
  echo "jdbc:postgresql://localhost:5432/resumepilot"
}

case "$CMD" in
  help|-h|--help) usage ;;
  deploy) cmd_deploy "$@" ;;
  tunnel) cmd_tunnel "$@" ;;
  db) cmd_db "$@" ;;
  *)
    echo "Unknown command: $CMD" >&2
    usage >&2
    exit 1
    ;;
esac
