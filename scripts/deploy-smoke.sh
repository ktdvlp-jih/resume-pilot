#!/usr/bin/env bash
# Post-deploy HTTP smoke — TC-02 in docs/deploy-test-cases.md
set -euo pipefail

PORT="${APP_PORT:-9180}"
BASE="http://127.0.0.1:${PORT}"

check() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}")"
  if [[ "${code}" != "200" ]]; then
    echo "SMOKE FAIL ${path} -> HTTP ${code}"
    exit 1
  fi
  echo "SMOKE OK   ${path} -> HTTP ${code}"
}

check /
check /admin/
check /swagger-ui.html
echo "All HTTP smoke checks passed."
