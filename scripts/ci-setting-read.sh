#!/usr/bin/env bash
# Read deploy CI toggle from system_settings (postgres). Used by post-deploy smoke scripts.
set -euo pipefail

KEY="${1:?setting key required}"
DEFAULT="${2:-true}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi

PG_USER="${POSTGRES_USER:-resumepilot}"
PG_DB="${POSTGRES_DB:-resumepilot}"

if ! command -v docker >/dev/null 2>&1; then
  echo "$DEFAULT"
  exit 0
fi

VAL="$(docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" -t -A -c \
  "SELECT setting_value FROM system_settings WHERE setting_key='${KEY}'" 2>/dev/null | tr -d '[:space:]' || true)"

if [[ -z "$VAL" ]]; then
  echo "$DEFAULT"
elif [[ "$VAL" == "true" || "$VAL" == "1" || "$VAL" == "yes" ]]; then
  echo "true"
else
  echo "false"
fi
