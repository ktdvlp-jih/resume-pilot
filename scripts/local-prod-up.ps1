#Requires -Version 5.1
<#
.SYNOPSIS
  Prod 스모크 테스트 — docker-compose.yml 단일 파일

.USAGE
  .\scripts\local-prod-up.ps1
  .\scripts\local-prod-up.ps1 -Build
#>
param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$env:APP_PORT = "8080"
$env:POSTGRES_PORT = "55433"

$buildArg = if ($Build) { @("--build") } else { @() }

Write-Host "==> Starting prod stack (SPA in app container)..." -ForegroundColor Cyan
docker compose --env-file .env.production.example up -d @buildArg

Write-Host ""
Write-Host "ResumePilot prod smoke (local):" -ForegroundColor Green
Write-Host "  App:     http://localhost:8080/"
Write-Host "  Admin:   http://localhost:8080/admin/"
Write-Host "  API:     http://localhost:8080/api/v1"
Write-Host "  Swagger: http://localhost:8080/swagger-ui.html"
Write-Host ""
Write-Host "Stop: docker compose --env-file .env.production.example down"
