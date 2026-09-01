#!/usr/bin/env bash
# 푸시 전 프론트 TypeScript·Vite 빌드 검증 (npm run dev는 tsc를 돌리지 않음)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== resume-web build =="
(cd "${ROOT}/resume-web" && npm run build)

echo "== resume-admin build =="
(cd "${ROOT}/resume-admin" && npm run build)

echo "Pre-push web builds passed."
