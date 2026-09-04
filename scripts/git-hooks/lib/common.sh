#!/usr/bin/env bash
# ResumePilot 공용 git hook 함수
# 커밋·푸시 전 프론트엔드 실빌드 검증 (npm ci + npm run build) 강제 — CI와 동일 명령
set -euo pipefail

# 스테이징/변경 파일 중 해당 앱 파일이 있는지 검사
app_changed() {
  local app="$1"   # resume-web | resume-admin
  local files="$2"
  printf '%s\n' "$files" | grep -q "^${app}/" || return 1
  return 0
}

# 변경 파일에서 npm ci가 필요한지(lockfile 변경) 판단
lock_changed() {
  local app="$1"
  local files="$2"
  printf '%s\n' "$files" | grep -q "^${app}/package-lock.json" || return 1
  return 0
}

# 앱 실빌드 검증. 의존성이 없거나 lockfile이 바뀌었으면 npm ci 후 build.
verify_frontend_app() {
  local app="$1"        # resume-web | resume-admin
  local changed_files="$2"
  local root app_dir

  root="$(git rev-parse --show-toplevel)"
  app_dir="${root}/${app}"

  echo ""
  echo "=== [git-hook] ${app}: npm ci + npm run build ==="
  if [ ! -d "${app_dir}/node_modules" ] || lock_changed "${app}" "${changed_files}"; then
    (cd "${app_dir}" && npm ci --no-audit --no-fund)
  else
    echo "(node_modules 최신 상태 — npm ci 생략, CI와 동일하게 npm run build 수행)"
  fi
  (cd "${app_dir}" && npm run build)
  echo "=== [git-hook] ${app} build PASSED ==="
}

# resume-web / resume-admin 중 실제 수정된 앱을 빌드 검증
verify_changed_frontends() {
  local changed_files="$1"
  if app_changed resume-web "${changed_files}"; then
    verify_frontend_app resume-web "${changed_files}"
  fi
  if app_changed resume-admin "${changed_files}"; then
    verify_frontend_app resume-admin "${changed_files}"
  fi
}
