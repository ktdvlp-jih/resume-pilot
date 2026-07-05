#!/usr/bin/env bash
# Deploy ResumePilot to Linux server via rsync + docker compose
#
# Usage:
#   export DEPLOY_HOST=jeon@your-lan-host
#   ./scripts/deploy-remote.sh
#   ./scripts/deploy-remote.sh jeon@your-lan-host

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Load DEPLOY_HOST / LAN_HOST from .env if present
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi

DEPLOY_HOST="${1:-${DEPLOY_HOST:-}}"
REMOTE_DIR="${REMOTE_DIR:-~/apps/resume-pilot}"
APP_PORT="${APP_PORT:-9180}"

if [[ -z "$DEPLOY_HOST" ]]; then
  echo "DEPLOY_HOST not set. Add to .env or pass as argument. See docs/SETUP.md#part-3-ubuntu-서버" >&2
  exit 1
fi

LAN_HOST="${LAN_HOST:-${DEPLOY_HOST#*@}}"

echo "==> Deploying ResumePilot to ${DEPLOY_HOST}:${REMOTE_DIR}"

ssh "${DEPLOY_HOST}" "mkdir -p ${REMOTE_DIR}"

rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude 'build' \
  --exclude '.gradle' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude '.venv' \
  --exclude 'venv' \
  --exclude '.env' \
  --exclude '.specstory' \
  "${ROOT}/" "${DEPLOY_HOST}:${REMOTE_DIR}/"

echo "==> Setting up .env on remote (if missing)"
ssh "${DEPLOY_HOST}" "cd ${REMOTE_DIR} && \
  if [ ! -f .env ]; then cp .env.production.example .env && echo 'Created .env — edit secrets before production use!'; fi"

echo "==> Building and starting containers"
ssh "${DEPLOY_HOST}" "cd ${REMOTE_DIR} && chmod +x scripts/server-up.sh && ./scripts/server-up.sh"

echo ""
echo "==> Deployment complete!"
echo "  App:     http://${LAN_HOST}:${APP_PORT}/"
echo "  Admin:   http://${LAN_HOST}:${APP_PORT}/admin/"
echo "  API:     http://${LAN_HOST}:${APP_PORT}/api/v1"
echo ""
echo "  .env was NOT uploaded — scp .env to server if needed (SETUP.md §3-6)"
echo ""
echo "Check status: ssh ${DEPLOY_HOST} 'cd ${REMOTE_DIR} && docker compose ps'"
