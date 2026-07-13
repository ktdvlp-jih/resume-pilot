#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy ResumePilot to Linux server via tar + scp + ssh

.USAGE
  # .env 에 DEPLOY_HOST=jeon@your-lan-host 설정 후
  .\scripts\deploy-remote.ps1
  .\scripts\deploy-remote.ps1 -DeployHost jeon@your-lan-host
#>
param(
    [string]$DeployHost = $env:DEPLOY_HOST,
    [string]$RemoteDir = "${env:REMOTE_DIR:-~/apps/resume-pilot}"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

# Load .env for DEPLOY_HOST / LAN_HOST if present
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $k = $Matches[1].Trim(); $v = $Matches[2].Trim()
            if ($k -eq 'DEPLOY_HOST' -and -not $DeployHost) { $DeployHost = $v }
            if ($k -eq 'LAN_HOST' -and -not $env:LAN_HOST) { Set-Item -Path "env:LAN_HOST" -Value $v }
            if ($k -eq 'APP_PORT' -and -not $env:APP_PORT) { Set-Item -Path "env:APP_PORT" -Value $v }
        }
    }
}

if (-not $DeployHost) {
    Write-Error "DEPLOY_HOST not set. Add to .env or pass -DeployHost. See docs/SETUP.md#part-3-ubuntu-서버"
}

$Archive = Join-Path $env:TEMP "resume-pilot-deploy.tar.gz"
$AppPort = if ($env:APP_PORT) { $env:APP_PORT } else { "9180" }
$LanHost = if ($env:LAN_HOST) { $env:LAN_HOST } elseif ($DeployHost -match '@(.+)$') { $Matches[1] } else { "localhost" }

Write-Host "==> Packaging project..." -ForegroundColor Cyan
Push-Location $Root
try {
    if (Test-Path $Archive) { Remove-Item $Archive -Force }

    tar -czf $Archive `
        --exclude=.git `
        --exclude=node_modules `
        --exclude=dist `
        --exclude=build `
        --exclude=.gradle `
        --exclude=__pycache__ `
        --exclude=.pytest_cache `
        --exclude=.venv `
        --exclude=venv `
        --exclude=.env `
        --exclude=.specstory `
        .
} finally {
    Pop-Location
}

Write-Host "==> Deploying to ${DeployHost}:${RemoteDir}..." -ForegroundColor Cyan
ssh $DeployHost "mkdir -p ${RemoteDir}"

Write-Host "==> Uploading archive..." -ForegroundColor Cyan
scp $Archive "${DeployHost}:${RemoteDir}/deploy.tar.gz"

Write-Host "==> Extracting and starting on remote..." -ForegroundColor Cyan
$RemoteCmd = @"
cd ${RemoteDir} && \
tar -xzf deploy.tar.gz && rm deploy.tar.gz && \
if [ ! -f .env ]; then cp .env.production.example .env; echo 'Created .env from production example'; fi && \
docker compose up -d --build
"@

ssh $DeployHost $RemoteCmd

Remove-Item $Archive -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==> Deployment complete!" -ForegroundColor Green
Write-Host "  App:     http://${LanHost}:${AppPort}/"
Write-Host "  Admin:   http://${LanHost}:${AppPort}/admin/"
Write-Host "  API:     http://${LanHost}:${AppPort}/api/v1"
Write-Host "  Swagger: http://${LanHost}:${AppPort}/swagger-ui.html"
Write-Host ""
Write-Host "  .env was NOT uploaded — scp .env to server if needed (SETUP.md §3-6)"
Write-Host ""
Write-Host "Status: ssh $DeployHost 'cd ${RemoteDir} && docker compose ps'"
