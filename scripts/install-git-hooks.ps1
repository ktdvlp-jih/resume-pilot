# ResumePilot git hook 설치 (Windows PowerShell)
#   powershell -ExecutionPolicy Bypass -File scripts\install-git-hooks.ps1
# hooksPath를 scripts/git-hooks 로 설정 → pre-commit·pre-push가 프론트 빌드 검증 강제
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$hooksPath = Join-Path (Resolve-Path "$root\scripts\git-hooks").Path ''

git config core.hooksPath "$hooksPath"

Write-Host ""
Write-Host "git hooksPath -> $hooksPath" -ForegroundColor Green
Write-Host "pre-commit / pre-push: resume-web·resume-admin 변경 시 npm ci + npm run build 자동 실행" -ForegroundColor Cyan
