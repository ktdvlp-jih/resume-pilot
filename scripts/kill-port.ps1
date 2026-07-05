param(
    [Parameter(Position = 0)]
    [int]$Port = 5173,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Get-ListenerPids([int]$TargetPort) {
    $pids = @()
    try {
        $pids += Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        # Get-NetTCPConnection unavailable
    }

    if (-not $pids) {
        $pids += netstat -ano | Select-String ":\s*$TargetPort\s" | Select-String "LISTENING" |
            ForEach-Object {
                if ($_ -match '\s(\d+)\s*$') { [int]$Matches[1] }
            }
    }

    return $pids | Where-Object { $_ -gt 0 } | Select-Object -Unique
}

Write-Host "Port $Port listeners:" -ForegroundColor Cyan

$pids = Get-ListenerPids -TargetPort $Port
if (-not $pids) {
    Write-Host "No process is listening on port $Port." -ForegroundColor Green
    exit 0
}

foreach ($targetPid in $pids) {
    $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "unknown" }
    Write-Host "  PID $targetPid ($name)" -ForegroundColor Yellow
}

if (-not $Force) {
    $answer = Read-Host "Kill these processes? [y/N]"
    if ($answer -notmatch '^[yY]') {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit 0
    }
}

foreach ($targetPid in $pids) {
    try {
        Stop-Process -Id $targetPid -Force -ErrorAction Stop
        Write-Host "Killed PID $targetPid" -ForegroundColor Green
    } catch {
        Write-Host "Failed to kill PID ${targetPid}: $_" -ForegroundColor Red
    }
}

Start-Sleep -Milliseconds 500
$remaining = Get-ListenerPids -TargetPort $Port
if ($remaining) {
    Write-Host "Warning: port $Port still in use by: $($remaining -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "Port $Port is now free." -ForegroundColor Green
