# 개발 환경 기동 순서 (Mac)
# Docker 없이 로컬 PostgreSQL + 터미널 기동
# 경로: ~/Desktop/Work/resume-pilot  (클론 위치에 맞게 바꾸기)
# 관리자 로그인: admin / admin

# ========== 0. 최초 1회만 ==========

# 0-1. JDK 21 + PostgreSQL 17 + pgvector
#    brew install openjdk@21 postgresql@17 pgvector
#    # ~/.zshrc 에 추가 후 새 터미널:
#    export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
#    export PATH="$JAVA_HOME/bin:/opt/homebrew/opt/postgresql@17/bin:$PATH"

# 0-2. DB 생성 (로컬, Docker 없음)
#    brew services start postgresql@17
#    psql -d postgres -c "CREATE USER resumepilot WITH PASSWORD 'resumepilot';" 2>/dev/null || true
#    psql -d postgres -c "CREATE DATABASE resumepilot OWNER resumepilot;" 2>/dev/null || true
#    psql -d resumepilot -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 0-3. 환경변수 파일
#    cd ~/Desktop/Work/resume-pilot
#    cp .env.example .env.local
#    # 필요 시 OPENAI_API_KEY 등만 수정

# 0-4. Python venv (서비스별)
#    cd ~/Desktop/Work/resume-pilot/rag-service
#    python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && deactivate
#    cd ~/Desktop/Work/resume-pilot/prompt-service
#    python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && deactivate
#    cd ~/Desktop/Work/resume-pilot/resume-ai
#    python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && deactivate

# 0-5. Node 의존성 + Gradle wrapper 실행권한
#    cd ~/Desktop/Work/resume-pilot/resume-web && npm install
#    cd ~/Desktop/Work/resume-pilot/resume-admin && npm install
#    chmod +x ~/Desktop/Work/resume-pilot/resume-api/gradlew
#    # ./gradlew 가 permission denied 이면 (SourceTree quarantine):
#    xattr -d com.apple.quarantine ~/Desktop/Work/resume-pilot/resume-api/gradlew
#    # 그래도 안 되면: bash ./gradlew bootRun

# 0-6. 포트 충돌 — 8080에 다른 프로세스(예: php -S)가 있으면 API가 못 뜸
#    lsof -nP -iTCP:8080 -sTCP:LISTEN
#    kill <PID>

# ========== 매 개발 세션 ==========

# 1. DB
    brew services start postgresql@17
    pg_isready -h localhost -p 5432

# 2. RAG (8002) — 터미널 1
    cd ~/Desktop/Work/resume-pilot
    source ./scripts/load-env-local.sh
    cd rag-service && source .venv/bin/activate
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8002

# 3. Prompt (8001) — 터미널 2
    cd ~/Desktop/Work/resume-pilot
    source ./scripts/load-env-local.sh
    cd prompt-service && source .venv/bin/activate
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8001

# 4. AI Gateway (8000) — 터미널 3 (RAG·Prompt 다음에)
    cd ~/Desktop/Work/resume-pilot
    source ./scripts/load-env-local.sh
    cd resume-ai && source .venv/bin/activate
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 5. Spring API (8080) — 터미널 4
    cd ~/Desktop/Work/resume-pilot
    source ./scripts/load-env-local.sh
    cd resume-api && ./gradlew bootRun
    # 실패 시: bash ./gradlew bootRun

# 6. 프론트 — 터미널 5·6 (로더 불필요)
    cd ~/Desktop/Work/resume-pilot/resume-web && npm run dev -- --host 127.0.0.1 --port 5173
    # → http://localhost:5173
    cd ~/Desktop/Work/resume-pilot/resume-admin && npm run dev -- --host 127.0.0.1 --port 5174
    # → http://localhost:5174/admin/

# ========== 기동 확인 ==========
#    curl -s http://127.0.0.1:8002/health
#    curl -s http://127.0.0.1:8001/health
#    curl -s http://127.0.0.1:8000/health
#    curl -s http://127.0.0.1:8080/actuator/health
#    open http://localhost:5173
#    open http://localhost:5174/admin/
