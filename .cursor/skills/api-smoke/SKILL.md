---
name: api-smoke
description: Run ResumePilot build and API smoke (health, auth, AI services). Use when user asks for API test, build verification, or local smoke test.
---

# ResumePilot API·빌드 스모크

## 참조

- `@docs/실행-가이드.md`
- `@docs/API-규약.md`

## 실행 순서

1. **빌드**
   - `cd resume-api && .\gradlew.bat compileJava`
   - `cd resume-web && npm run build`
   - `cd resume-admin && npm run build`

2. **서버** (로컬 터미널 또는 Docker)
   - API: `:8080` (dev) 또는 `:9180` (prod)
   - AI: `:8000`, `:8001`, `:8002`

3. **API 스모크** (PowerShell)

```powershell
$base = "http://localhost:8080"

# Swagger / health
Invoke-WebRequest "$base/swagger-ui.html" -UseBasicParsing

# 회원가입 (또는 기존 계정 login)
$signup = @{ email="smoke@test.com"; password="password123"; name="스모크" } | ConvertTo-Json
Invoke-RestMethod "$base/api/v1/auth/signup" -Method Post -Body $signup -ContentType "application/json"
```

4. **AI 서비스**

```powershell
Invoke-WebRequest "http://localhost:8000/docs" -UseBasicParsing
Invoke-WebRequest "http://localhost:8001/docs" -UseBasicParsing
Invoke-WebRequest "http://localhost:8002/docs" -UseBasicParsing
```

5. 실패 항목만 짧게 보고.
