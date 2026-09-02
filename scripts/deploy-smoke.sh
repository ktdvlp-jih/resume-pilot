#!/usr/bin/env bash
# Post-deploy smoke — TC-02 HTTP + TC-04 API (docs/배포-테스트-케이스.md)
set -euo pipefail

PORT="${APP_PORT:-9180}"
BASE="${SMOKE_BASE_URL:-http://127.0.0.1:${PORT}}"

http_check() {
  local path="$1"
  local code
  # -L: springdoc redirects /swagger-ui.html -> /swagger-ui/index.html (302)
  code="$(curl -sL -o /dev/null -w "%{http_code}" "${BASE}${path}")"
  if [[ "${code}" != "200" ]]; then
    echo "SMOKE FAIL HTTP ${path} -> ${code}"
    exit 1
  fi
  echo "SMOKE OK   HTTP ${path} -> ${code}"
}

api_check() {
  local name="$1"
  local method="$2"
  local path="$3"
  local data="${4:-}"
  local auth="${5:-}"
  local expect="${6:-200}"
  local args=(-s -o /tmp/smoke-body.json -w "%{http_code}" -X "${method}" "${BASE}${path}" -H "Content-Type: application/json")
  if [[ -n "${auth}" ]]; then
    args+=(-H "Authorization: Bearer ${auth}")
  fi
  if [[ -n "${data}" ]]; then
    args+=(-d "${data}")
  fi
  local code
  code="$(curl "${args[@]}")"
  if [[ "${code}" != "${expect}" ]]; then
    echo "SMOKE FAIL API ${name} -> HTTP ${code}"
    cat /tmp/smoke-body.json 2>/dev/null || true
    exit 1
  fi
  echo "SMOKE OK   API ${name} -> HTTP ${code}"
}

echo "== HTTP smoke (${BASE}) =="
http_check /
http_check /admin/
http_check /swagger-ui.html
http_check /actuator/health
http_check /api-docs

echo "== API smoke =="
api_check "GET /users/me (no auth)" GET /api/v1/users/me "" "" 401

STAMP="$(date +%s)"
EMAIL="smoke-${STAMP}@resumepilot.test"
PASS="password123"
SIGNUP_JSON="{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"name\":\"Smoke ${STAMP}\",\"termsAccepted\":true,\"privacyAccepted\":true}"

api_check "POST /auth/signup" POST /api/v1/auth/signup "${SIGNUP_JSON}"

TOKEN="$(
  BASE_URL="${BASE}" EMAIL="${EMAIL}" INTERNAL_API_TOKEN="${INTERNAL_API_TOKEN:-}" python3 - <<'PY'
import json, os, urllib.request
body = json.load(open("/tmp/smoke-body.json"))
data = body.get("data") or {}
tokens = data.get("tokens") or {}
token = tokens.get("accessToken")
if token:
    print(token)
    raise SystemExit(0)
if data.get("requiresEmailVerification"):
    internal = os.environ.get("INTERNAL_API_TOKEN", "").strip()
    if not internal:
        raise SystemExit("SMOKE FAIL signup requires email verification but INTERNAL_API_TOKEN is empty")
    email = data.get("email") or os.environ.get("EMAIL", "")
    base = os.environ["BASE_URL"].rstrip("/")
    req = urllib.request.Request(
        base + "/api/v1/internal/auth/force-verify-email",
        data=json.dumps({"email": email}).encode(),
        headers={"Content-Type": "application/json", "X-Internal-Token": internal},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        verified = json.load(resp)
    token = (verified.get("data") or {}).get("accessToken")
    if not token:
        raise SystemExit("SMOKE FAIL force-verify-email returned no accessToken")
    print(token)
    raise SystemExit(0)
raise SystemExit("SMOKE FAIL signup response has no tokens")
PY
)"
api_check "POST /auth/login" POST /api/v1/auth/login "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}"
api_check "GET /users/me (auth)" GET /api/v1/users/me "" "${TOKEN}"

python3 - <<'PY'
import json
import sys

with open("/tmp/smoke-body.json", encoding="utf-8") as f:
    body = json.load(f)

user = body.get("data") or {}
portfolio = user.get("careerPortfolio") or {}
cover = portfolio.get("coverLetter") or {}

if portfolio.get("careerStatement") is None:
    print("SMOKE FAIL careerPortfolio.careerStatement is null")
    sys.exit(1)

for key in ("jobExperience", "collaboration", "growthValues", "personality", "motivation"):
    if cover.get(key) is None:
        print(f"SMOKE FAIL careerPortfolio.coverLetter.{key} is null")
        sys.exit(1)

print("SMOKE OK   /users/me coverLetter fields normalized")
PY

api_check "GET /experiences" GET /api/v1/experiences "" "${TOKEN}"
api_check "GET /job-postings" GET /api/v1/job-postings "" "${TOKEN}"
api_check "GET /resumes" GET /api/v1/resumes "" "${TOKEN}"

echo "All smoke checks passed."
