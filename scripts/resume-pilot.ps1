# ResumePilot — Windows 통합 스크립트
# Usage:
#   .\scripts\resume-pilot.ps1 help
#   .\scripts\resume-pilot.ps1 setup          # 1회: .env/.env.local, npm, pip, compile
#   .\scripts\resume-pilot.ps1 github-ssh     # 1회: GitHub push SSH 키
#   .\scripts\resume-pilot.ps1 tunnel         # 매일: Tailscale DB 터널 (창 유지)
#   .\scripts\resume-pilot.ps1 tunnel -TailscaleIp 100.x.x.x

param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'setup', 'github-ssh', 'tunnel', 'db')]
    [string]$Command = 'help',

    [string]$TailscaleIp = '100.x.x.x',
    [string]$SshUser = 'jeon',
    [string]$PostgresPassword = $env:POSTGRES_ADMIN_PASSWORD
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Show-Help {
    Write-Host @"
ResumePilot scripts (Windows)

  .\scripts\resume-pilot.ps1 setup        1회 — .env/.env.local 복사, npm/pip, Gradle compile
  .\scripts\resume-pilot.ps1 github-ssh   1회 — GitHub SSH 키 + remote 설정
  .\scripts\resume-pilot.ps1 db           로컬 dev PostgreSQL (localhost:5432)
  .\scripts\resume-pilot.ps1 tunnel       매일 — DB SSH 터널 localhost:55532 (창 유지)

옵션 (tunnel):
  -TailscaleIp 100.x.x.x   Ubuntu Tailscale IP
  -SshUser jeon

DB 스키마: Flyway resume-api/src/main/resources/db/migration/ (prod Docker)
로컬 dev: AI 3개 터미널 (8002 rag, 8001 prompt, 8000 resume-ai) — Horizon ai 1개 대비 +2
상세: docs/설치-가이드.md#part-2-개발-pc
"@ -ForegroundColor Cyan
}

function Invoke-Setup {
    function Refresh-Path {
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                    [System.Environment]::GetEnvironmentVariable('Path', 'User')
    }
    Refresh-Path

    Write-Host '=== ResumePilot setup (Windows) ===' -ForegroundColor Cyan

    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
        Write-Host '[ok] Created .env' -ForegroundColor Green
    }

    if (-not (Test-Path '.env.local')) {
        Copy-Item '.env.example' '.env.local'
        Write-Host '[ok] Created .env.local' -ForegroundColor Green
    }

    # Horizon ai/.env 와 동일 — 각 AI 서비스가 cwd 기준 .env 를 읽음
    foreach ($svc in @('rag-service', 'prompt-service', 'resume-ai')) {
        if (-not (Test-Path "$svc\.env")) {
            Copy-Item '.env' "$svc\.env"
            Write-Host "[ok] Created $svc/.env" -ForegroundColor Green
        }
    }

    Write-Host "`n=== npm install ===" -ForegroundColor Cyan
    Push-Location resume-web; npm install; Pop-Location
    if (Test-Path 'resume-admin\package.json') {
        Push-Location resume-admin; npm install; Pop-Location
    }

    Write-Host "`n=== Python AI ===" -ForegroundColor Cyan
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { $py = Get-Command py -ErrorAction SilentlyContinue }
    if ($py) {
        foreach ($svc in @('rag-service', 'prompt-service', 'resume-ai')) {
            Push-Location $svc
            & $py.Name -m pip install --upgrade pip
            & $py.Name -m pip install -r requirements.txt
            Pop-Location
        }
    } else {
        Write-Host '[!!] Python 3.12+ required' -ForegroundColor Red
    }

    Write-Host "`n=== Gradle compile ===" -ForegroundColor Cyan
    Push-Location resume-api
    .\gradlew.bat compileJava --no-daemon
    Pop-Location

    Write-Host @"

=== Next ===
  0. .env.local 값(OPENAI_API_KEY, JWT_SECRET 등) 확인 후 각 터미널에서: . .\scripts\load-env-local.ps1
  1. .\scripts\resume-pilot.ps1 tunnel
  2. cd resume-api; .\gradlew.bat bootRun
  3. cd rag-service;       python -m uvicorn app.main:app --reload --port 8002
  4. cd prompt-service;    python -m uvicorn app.main:app --reload --port 8001
  5. cd resume-ai;         python -m uvicorn app.main:app --reload --port 8000
  6. cd resume-web;         npm run dev
  7. cd resume-admin;       npm run dev
"@ -ForegroundColor Green
}

function Invoke-GithubSsh {
    $sshDir = Join-Path $env:USERPROFILE '.ssh'
    $keyPath = Join-Path $sshDir 'id_ed25519_github'
    $pubPath = "$keyPath.pub"
    $configPath = Join-Path $sshDir 'config'
    $knownHosts = Join-Path $sshDir 'known_hosts'

    if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir | Out-Null }

    if (-not (Test-Path $keyPath)) {
        Write-Host "Generating GitHub SSH key: $keyPath" -ForegroundColor Cyan
        ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'ktdvlp-jih@github-resume-pilot'
    }

    $githubBlock = @"

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes

"@

    function Write-Utf8NoBomFile([string]$Path, [string]$Content) {
        $enc = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($Path, $Content, $enc)
    }

    if (Test-Path $configPath) {
        $cfg = Get-Content $configPath -Raw
        if ($cfg -notmatch 'Host github\.com') {
            Write-Utf8NoBomFile -Path $configPath -Content ($cfg.TrimEnd() + "`n" + $githubBlock.TrimStart())
        } else {
            Write-Utf8NoBomFile -Path $configPath -Content $githubBlock.TrimStart()
        }
    } else {
        Write-Utf8NoBomFile -Path $configPath -Content $githubBlock.TrimStart()
    }

    if (-not (Select-String -Path $knownHosts -Pattern 'github\.com' -Quiet -ErrorAction SilentlyContinue)) {
        ssh-keyscan -t ed25519 github.com 2>$null | Out-File -Append -Encoding ascii $knownHosts
    }

    $remote = git remote get-url origin 2>$null
    if ($remote -notmatch '^git@github\.com:') {
        git remote set-url origin git@github.com:ktdvlp-jih/resume-pilot.git
    }

    Write-Host "`n=== GitHub SSH public key ===" -ForegroundColor Cyan
    Get-Content $pubPath
    try {
        Get-Content $pubPath | Set-Clipboard
        Write-Host '[ok] Copied to clipboard — paste at https://github.com/settings/ssh/new' -ForegroundColor Green
    } catch { }
    Write-Host "Test: ssh -T git@github.com" -ForegroundColor Yellow
}

function Invoke-Db {
    Write-Host '=== ResumePilot local dev DB (localhost:5432) ===' -ForegroundColor Cyan
    docker start resume-pilot-db 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker run -d --name resume-pilot-db -p 5432:5432 `
            -e POSTGRES_DB=resumepilot `
            -e POSTGRES_USER=resumepilot `
            -e POSTGRES_PASSWORD=resumepilot `
            pgvector/pgvector:pg17
    }
    Write-Host 'jdbc:postgresql://localhost:5432/resumepilot' -ForegroundColor Green
}

function Invoke-Tunnel {
    Write-Host '=== ResumePilot DB tunnel (Tailscale) ===' -ForegroundColor Cyan
    Write-Host "Ubuntu: ${SshUser}@${TailscaleIp}"
    Write-Host 'Forward: localhost:55532 -> remote localhost:55532'
    Write-Host 'Keep this window open.' -ForegroundColor Yellow
    ssh -L 55532:localhost:55532 "${SshUser}@${TailscaleIp}"
}

switch ($Command) {
    'help' { Show-Help }
    'setup' { Invoke-Setup }
    'github-ssh' { Invoke-GithubSsh }
    'db' { Invoke-Db }
    'tunnel' { Invoke-Tunnel }
}
