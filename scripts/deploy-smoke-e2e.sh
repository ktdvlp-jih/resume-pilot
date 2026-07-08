#!/usr/bin/env bash
# Post-deploy E2E smoke — Playwright in Docker (self-hosted runner has no host npm)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi

PORT="${APP_PORT:-9180}"
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:${PORT}}"
PLAYWRIGHT_VERSION="$(python3 -c "import json; print(json.load(open('${ROOT}/e2e/package-lock.json'))['packages']['node_modules/@playwright/test']['version'])")"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy}"

if ! command -v docker >/dev/null 2>&1; then
  echo "SMOKE FAIL E2E: docker not found"
  exit 1
fi

if [[ "$(bash "${ROOT}/scripts/ci-setting-read.sh" deploy_e2e_enabled true)" != "true" ]]; then
  echo "SMOKE SKIP E2E: disabled in admin deploy settings (deploy_e2e_enabled=false)"
  exit 0
fi

echo "== E2E smoke (Playwright Docker ${PLAYWRIGHT_VERSION}, ${BASE_URL}) =="
docker run --rm --network host \
  -v "${ROOT}/e2e:/e2e" \
  -w /e2e \
  -e PLAYWRIGHT_BASE_URL="${BASE_URL}" \
  "${IMAGE}" \
  bash -lc "npm ci && npx playwright test tests/smoke.spec.ts tests/user-journey.spec.ts --reporter=list"
echo "SMOKE OK   E2E Playwright smoke + user journey passed."
