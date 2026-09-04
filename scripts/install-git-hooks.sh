#!/usr/bin/env bash
# ResumePilot git hook 설치 (macOS / Linux / Git Bash)
#   ./scripts/install-git-hooks.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_PATH="${ROOT}/scripts/git-hooks"

git config core.hooksPath "${HOOKS_PATH}"

chmod +x "${HOOKS_PATH}/pre-commit" "${HOOKS_PATH}/pre-push" "${HOOKS_PATH}/lib/common.sh"

echo ""
echo "git hooksPath -> ${HOOKS_PATH}"
echo "pre-commit / pre-push: resume-web·resume-admin 변경 시 npm ci + npm run build 자동 실행"
