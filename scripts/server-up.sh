#!/usr/bin/env bash
# Run ON the Linux server (~/apps/resume-pilot)
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.production.example .env
  echo "Created .env — edit POSTGRES_PASSWORD, JWT_SECRET, then re-run"
  exit 1
fi

docker compose up -d --build

echo ""
docker compose ps
HOST="${DEPLOY_HOST:-$(hostname -I | awk '{print $1}')}"
API="${APP_PORT:-9180}"

echo ""
echo "ResumePilot:"
echo "  App:     http://${HOST}:${API}/"
echo "  Admin:   http://${HOST}:${API}/admin/"
echo "  API:     http://${HOST}:${API}/api/v1"
echo "  Swagger: http://${HOST}:${API}/swagger-ui.html"
echo ""
echo "Named Tunnel origin: http://127.0.0.1:${API}"
