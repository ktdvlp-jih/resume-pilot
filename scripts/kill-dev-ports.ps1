# Kill resume-web (5173) and resume-admin (5174) dev servers
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Stopping frontend dev servers..." -ForegroundColor Cyan
& "$ScriptDir\kill-port.ps1" -Port 5173 -Force
& "$ScriptDir\kill-port.ps1" -Port 5174 -Force

Write-Host "`nRestart resume-web:" -ForegroundColor Green
Write-Host "  cd resume-web; npm run dev"
