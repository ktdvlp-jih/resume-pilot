#!/usr/bin/env bash
# .env.local → 현재 셸 환경변수. 사용: source ./scripts/load-env-local.sh
# (실행 권한으로 직접 돌리면 자식 프로세스에만 적용되므로 반드시 source)

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo ".env.local 없음: $ENV_FILE" >&2
  echo "  cp .env.example .env.local 후 값을 채우세요." >&2
  return 1 2>/dev/null || exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8}"
export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"

echo ".env.local 로드 완료"
