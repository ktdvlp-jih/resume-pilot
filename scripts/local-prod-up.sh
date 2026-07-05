#!/usr/bin/env bash
# Prod smoke test locally (same as local-prod-up.ps1)
set -euo pipefail
cd "$(dirname "$0")/.."

export APP_PORT=8080
export POSTGRES_PORT=55433

docker compose --env-file .env.production.example up -d --build

echo ""
echo "ResumePilot prod smoke (local):"
echo "  App:     http://localhost:8080/"
echo "  Admin:   http://localhost:8080/admin/"
echo "  Swagger: http://localhost:8080/swagger-ui.html"
