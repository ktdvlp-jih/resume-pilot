# ResumePilot 로컬 개발 안내 (터미널 실행)

Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
docker start resume-pilot-db 2>$null
if ($LASTEXITCODE -ne 0) {
  docker run -d --name resume-pilot-db -p 5432:5432 `
    -e POSTGRES_DB=resumepilot -e POSTGRES_USER=resumepilot -e POSTGRES_PASSWORD=resumepilot `
    pgvector/pgvector:pg17
}

Write-Host @"

ResumePilot — 로컬 개발 (터미널)
================================
1. AI (3 terminals):
   rag-service      → uvicorn app.main:app --reload --port 8002
   prompt-service   → uvicorn app.main:app --reload --port 8001
   resume-ai        → uvicorn app.main:app --reload --port 8000

2. API:
   resume-api       → .\gradlew.bat bootRun

3. Frontend:
   resume-web       → npm run dev   (5173)
   resume-admin     → npm run dev   (5174/admin/)

상세: docs/RUNNING.md

배포(Docker):  .\scripts\local-prod-up.ps1  또는  ./scripts/server-up.sh
"@ -ForegroundColor Green
