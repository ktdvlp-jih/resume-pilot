# ResumePilot 배포·기능 테스트 케이스

GitHub Actions `deploy.yml` (master push) 또는 `./scripts/resume-pilot.sh deploy` 실행 후 검증용 체크리스트.

> 마지막 업데이트: 2026-07-06 (공통 UI·AI 서비스별 TC)

**접속 URL 예시**

| 환경 | URL |
|------|-----|
| LAN | `http://192.168.219.100:9180` |
| Quick Tunnel | `https://<subdomain>.trycloudflare.com` |

**AI 사전 조건**

| 항목 | 설명 |
|------|------|
| `OPENAI_API_KEY` | `.env`에 설정 — LLM·임베딩 호출에 필요 |
| `OPENAI_BASE_URL` | (선택) Gemini 등 OpenAI 호환 API |
| 내부 포트 | resume-ai `8000`, prompt-service `8001`, rag-service `8002` — compose 내부망 only |

**UI 공통 스타일**

- shadcn/ui (Radix nova) + violet CSS 변수 테마 — `resume-web/src/index.css`, `resume-admin/src/index.css`
- 컴포넌트: `src/components/ui/*` (Button, Card, Input, Sidebar 등)

---

## TC-01 — Docker 컨테이너 (5개)

```bash
cd ~/apps/resume-pilot
docker compose ps
```

| # | 검증 | 기대 |
|---|------|------|
| 1 | `resume-pilot-app` | **Up** (Restarting 아님), `9180->8080` |
| 2 | `resume-pilot-postgres` | Up (healthy) |
| 3 | `resume-pilot-ai` | Up |
| 4 | `resume-pilot-prompt` | Up |
| 5 | `resume-pilot-rag` | Up |

실패 시: `docker compose logs app --tail 80` (Flyway·기동 오류 확인)

---

## TC-02 — HTTP 엔드포인트 (app)

```bash
APP_PORT=${APP_PORT:-9180}
curl -sfL -o /dev/null -w "swagger:%{http_code}\n" "http://localhost:${APP_PORT}/swagger-ui.html"
curl -s -o /dev/null -w "root:%{http_code}\n" "http://localhost:${APP_PORT}/"
curl -s -o /dev/null -w "admin:%{http_code}\n" "http://localhost:${APP_PORT}/admin/"
```

| # | URL | 기대 |
|---|-----|------|
| 1 | `/swagger-ui.html` | 200 |
| 2 | `/` | 200 |
| 3 | `/admin/` | 200 |

---

## TC-03 — GitHub Actions 자동 배포

| # | 검증 | 기대 |
|---|------|------|
| 1 | master push → Actions | Deploy Docker 성공 |
| 2 | Health + smoke | `deploy-smoke.sh` HTTP/API + Playwright Docker E2E |

---

## TC-04 — 인증 CRUD

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 회원가입 `/signup` | 계정 생성 |
| 2 | 로그인 `/login` | JWT·대시보드 이동 |
| 3 | 로그아웃 | `/login` 리다이렉트 |
| 4 | `GET /api/v1/users/me` | 프로필 조회 |
| 5 | `PATCH /api/v1/users/me` | 이름·포트폴리오 수정 |

---

## TC-05 — 다크모드

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | 다크모드 토글 | 배경·카드 어두운 테마 |
| 2 | F5 새로고침 | `localStorage.theme` 유지 |
| 3 | `<html class="dark">` | DevTools 확인 |

---

## TC-06 — UI 공통 (shadcn/Radix)

| # | 대상 | 기대 |
|---|------|------|
| 1 | Button, Input, Card | Radix 스타일·violet primary |
| 2 | Sidebar (앱 셸) | 접기·네비·다크모드 |
| 3 | disabled 상태 | not-allowed·opacity |
| 4 | 본문 텍스트 | 기본 커서 유지 |

---

## TC-07 — 마이페이지 · 경력 포트폴리오 CRUD

**경로:** `/settings`

| # | 항목 | CRUD | 기대 |
|---|------|------|------|
| 1 | 경력 | C/U/D | 회사·직무·기간·상세 저장 |
| 2 | 학력 | C/U/D | 학교·전공·학위 |
| 3 | 스킬 | C/U/D | 이름·카테고리·숙련도 |
| 4 | 경력 기술서 | U | 자유 서술 |
| 5 | 자소서 5-1~5-5 | U | 섹션별 저장 |
| 6 | 완성도 % | R | 입력량 반영 |
| 7 | 계정 탭 | U | 이름·전화·비밀번호 |

---

## TC-08 — 대시보드 오버뷰

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | Bento 카드 | TC-07 데이터 미리보기 |
| 2 | 편집 링크 | `/settings` |
| 3 | 이력서 목록 | CRUD 링크 동작 |

---

## TC-09 — 도메인 CRUD 회귀

| # | 리소스 | 경로 | CRUD |
|---|--------|------|------|
| 1 | 경험 라이브러리 | `/experiences` | 목록·추가·수정·삭제 |
| 2 | 채용공고 | `/job-postings` | 업로드·목록·삭제 |
| 3 | 이력서 | `/workspace`, API | 생성·버전·삭제 |
| 4 | 문체 | `/writing-style` | 조회·분석 |
| 5 | 언어 | LanguageSwitcher | ko/en/ja/zh |

---

# AI 테스트 (서비스별)

> 내부 서비스는 `docker compose exec`로 직접 호출 가능.  
> 사용자 플로우는 **resume-api (`9180`)** 경유가 정식 경로.

---

## TC-AI-01 — prompt-service (포트 8001)

**역할:** DB의 활성 프롬프트 템플릿 조회·변수 치환·테스트 호출

```bash
# 헬스
docker compose exec prompt-service curl -s http://localhost:8001/health | jq .

# 활성 프롬프트 조회 (V10 seed: RESUME_GENERATION 등)
docker compose exec prompt-service curl -s http://localhost:8001/prompts/RESUME_GENERATION | jq .

# 버전 목록
docker compose exec prompt-service curl -s http://localhost:8001/prompts/RESUME_GENERATION/versions | jq .

# 변수 치환 렌더
docker compose exec prompt-service curl -s -X POST http://localhost:8001/prompts/render \
  -H "Content-Type: application/json" \
  -d '{"prompt_type":"RESUME_GENERATION","variables":{"experiences":"[]","job_analysis":"{}","writing_style":"","rewrite_level":40}}' | jq .

# LLM 테스트 호출 (OPENAI_API_KEY 필요)
docker compose exec prompt-service curl -s -X POST http://localhost:8001/prompts/test \
  -H "Content-Type: application/json" \
  -d '{"prompt_type":"RESUME_GENERATION","variables":{"experiences":"테스트 경험","job_analysis":"백엔드 개발","writing_style":"","rewrite_level":40}}' | jq .
```

| # | API | 검증 포인트 | 기대 |
|---|-----|-------------|------|
| 1 | `GET /health` | 서비스 생존 | `status: ok` |
| 2 | `GET /prompts/{type}` | DB 시드 (V10) | `system_prompt`, `user_prompt`, `version_number` |
| 3 | `GET /prompts/{type}/versions` | 버전 이력 | 1건 이상 |
| 4 | `POST /prompts/render` | `{{variables}}` 치환 | `experiences` 등 반영된 문자열 |
| 5 | `POST /prompts/test` | OpenAI 호출 | `result` 텍스트 (키 없으면 5xx/에러) |

**프롬프트 타입 (seed 기준):** `RESUME_GENERATION`, `JOB_ANALYSIS`, `AI_DETECTION`, `AI_REVIEW`

---

## TC-AI-02 — rag-service (포트 8002)

**역할:** pgvector 임베딩 저장·유사도 검색·자소서 생성용 컨텍스트 조립

```bash
USER_ID="<로그인 사용자 UUID>"
EXP_ID="<경험 UUID>"

# 헬스
docker compose exec rag-service curl -s http://localhost:8002/health | jq .

# 임베딩 upsert (경험 텍스트)
docker compose exec rag-service curl -s -X POST http://localhost:8002/embeddings \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"entity_type\":\"experience\",\"entity_id\":\"$EXP_ID\",\"text\":\"Spring Boot API 성능 30% 개선\",\"metadata\":{\"title\":\"백엔드\"}}" | jq .

# 벡터 검색
docker compose exec rag-service curl -s -X POST http://localhost:8002/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"백엔드 API\",\"user_id\":\"$USER_ID\",\"entity_types\":[\"experience\"],\"top_k\":5}" | jq .

# 컨텍스트 빌드 (resume-ai가 호출)
docker compose exec rag-service curl -s -X POST http://localhost:8002/context/build \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"keywords\":[\"Spring\",\"API\"],\"job_analysis\":{\"position\":\"백엔드\"},\"top_k\":5}" | jq .
```

| # | API | 검증 포인트 | 기대 |
|---|-----|-------------|------|
| 1 | `GET /health` | 서비스 생존 | `status: ok` |
| 2 | `POST /embeddings` | OpenAI embedding + DB upsert | `entity_id`, 벡터 차원 일치 |
| 3 | `POST /search` | 코사인 유사도 | 관련 experience 상위 N건, `score` 내림차순 |
| 4 | `POST /context/build` | experiences + writing_styles 묶음 | `context.experiences` 배열 |
| 5 | 재검색 | 동일 user_id 격리 | 타 사용자 데이터 미포함 |

**UI 연동:** `POST /api/v1/experiences/{id}/embed`, `POST /api/v1/rag/recommend-experiences`

---

## TC-AI-03 — resume-ai (포트 8000, AI Gateway)

**역할:** LLM 오케스트레이션 — prompt-service·rag-service 호출 후 생성·분석·탐지·첨삭

```bash
USER_ID="<UUID>"

# 헬스
docker compose exec resume-ai curl -s http://localhost:8000/health | jq .

# 채용공고 분석
docker compose exec resume-ai curl -s -X POST http://localhost:8000/analyze/job-posting \
  -H "Content-Type: application/json" \
  -d '{"source_type":"TEXT","content":"백엔드 개발자 모집. Java, Spring, AWS 요구."}' | jq .

# 문체 분석
docker compose exec resume-ai curl -s -X POST http://localhost:8000/analyze/writing-style \
  -H "Content-Type: application/json" \
  -d '{"content":"저는 성실하고 책임감 있는 개발자입니다."}' | jq .

# 자소서 생성 (RAG + Prompt + LLM)
docker compose exec resume-ai curl -s -X POST http://localhost:8000/generate/resume \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"keywords\":[\"Spring\",\"API\"],\"rewrite_level\":40,\"job_analysis\":{\"position\":\"백엔드\"}}" | jq .

# AI 흔적 탐지
docker compose exec resume-ai curl -s -X POST http://localhost:8000/detect/ai-traces \
  -H "Content-Type: application/json" \
  -d '{"content":"최선을 다하겠습니다. 끊임없이 성장하겠습니다.","forbidden_expressions":["최선을 다하겠습니다"]}' | jq .

# 첨삭
docker compose exec resume-ai curl -s -X POST http://localhost:8000/review/feedback \
  -H "Content-Type: application/json" \
  -d '{"content":"지원 동기 문단...","job_analysis":{"company_name":"테스트"}}' | jq .

# 면접 질문
docker compose exec resume-ai curl -s -X POST http://localhost:8000/generate/interview-questions \
  -H "Content-Type: application/json" \
  -d '{"content":"생성된 자소서 본문..."}' | jq .

# 키워드 매칭
docker compose exec resume-ai curl -s -X POST http://localhost:8000/compare/keywords \
  -H "Content-Type: application/json" \
  -d '{"job_keywords":["Spring","AWS"],"resume_content":"Spring Boot로 API를 개발했습니다."}' | jq .
```

| # | API | 연동 서비스 | 기대 응답 필드 |
|---|-----|-------------|----------------|
| 1 | `POST /analyze/job-posting` | LLM (+ company enrich) | `required_skills`, `tech_keywords`, `position` 등 |
| 2 | `POST /analyze/writing-style` | 규칙/LLM | `frequent_words`, `tone`, `sentence_style` |
| 3 | `POST /generate/resume` | **rag** → **prompt** → LLM | `content`, `quality_scores`, `detections`, `reviews`, `experience_ids` |
| 4 | `POST /detect/ai-traces` | 규칙 + 금지어 | `detections[]` (`level`: GREEN/YELLOW/RED) |
| 5 | `POST /review/feedback` | 규칙/LLM | `strengths`, `weaknesses`, 문단별 `improvement` |
| 6 | `POST /generate/interview-questions` | LLM/규칙 | `questions[]` (`category`, `question`) |
| 7 | `POST /compare/keywords` | 규칙 | 매칭/누락 키워드 통계 |

---

## TC-AI-04 — resume-api AI 오케스트레이션 (포트 9180)

**역할:** JWT 인증 + DB 아티팩트 저장 + 내부 AI 호출

```bash
BASE="http://localhost:9180"
TOKEN="<access_token>"

# 자소서 AI 생성
curl -s -X POST "$BASE/api/v1/ai/generate" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"keywords":["Spring"],"rewriteLevel":40,"jobAnalysis":{"position":"백엔드"}}' | jq .

# AI 흔적 탐지
curl -s -X POST "$BASE/api/v1/ai/detect" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"최선을 다하겠습니다."}' | jq .

# 첨삭
curl -s -X POST "$BASE/api/v1/ai/review" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"자소서 본문","jobAnalysis":{"company_name":"A사"}}' | jq .

# 면접 질문
curl -s -X POST "$BASE/api/v1/ai/interview-questions" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"content":"자소서 본문"}' | jq .

# 키워드 비교
curl -s -X POST "$BASE/api/v1/ai/compare-keywords" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"jobKeywords":["Java"],"resumeContent":"Java Spring 개발"}' | jq .

# RAG 경험 추천
curl -s -X POST "$BASE/api/v1/rag/recommend-experiences" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"keywords":["Spring","API"],"topK":5}' | jq .

# 생성 이력
curl -s "$BASE/api/v1/ai/generations" -H "Authorization: Bearer $TOKEN" | jq .
```

| # | UI 경로 | API | DB 저장 | 기대 |
|---|---------|-----|---------|------|
| 1 | `/job-postings` 업로드 | 내부 → `/analyze/job-posting` | `job_postings`, `job_analyses` | 분석 패널 표시 |
| 2 | `/writing-style` | `POST /writing-style/analyze` | `user_writing_styles` | 문체 프로필 |
| 3 | `/experiences` embed | `POST /experiences/{id}/embed` | vector_embeddings | RAG 검색 가능 |
| 4 | `/workspace` 생성 | `POST /ai/generate` | `ai_generations` | 본문·점수·탐지·첨삭 |
| 5 | `/workspace` | `POST /ai/detect` | (옵션) `ai_detections` | 하이라이트 레벨 |
| 6 | `/workspace` | `POST /ai/review` | `ai_reviews` | 강점·약점 |
| 7 | `/workspace` | `POST /ai/interview-questions` | — | 질문 목록 |
| 8 | `/workspace` | `POST /ai/compare-keywords` | — | 키워드 매칭률 |
| 9 | `/workspace` | `POST /rag/recommend-experiences` | — | 경험 추천 리스트 |

---

## TC-AI-05 — AI E2E 플로우 (브라우저)

| 단계 | 액션 | 검증 (AI) |
|------|------|-----------|
| 1 | 경험 2건 이상 등록 | — |
| 2 | 경험 embed (UI 또는 API) | rag-service 임베딩 |
| 3 | 채용공고 텍스트 업로드 | job 분석 결과 |
| 4 | `/workspace` → 공고 선택 → **경험 추천** | rag recommend |
| 5 | **자소서 생성** | generate + quality_scores |
| 6 | 결과 패널: AI 탐지·첨삭·면접질문·키워드 | 각 API 결과 표시 |
| 7 | (관리자) `/admin` AI 로그 | `ai_usage_logs` 기록 |

**OPENAI_API_KEY 미설정 시:** TC-AI-03~05 중 LLM 호출 단계 FAIL 예상 — prompt `test`, `generate/resume`부터 확인

---

## TC-10 — Quick Tunnel (선택)

| # | 검증 | 기대 |
|---|------|------|
| 1 | `journalctl -u cloudflared-quick-resume` | trycloudflare URL |
| 2 | Tunnel URL SPA | assets 200, 로그인 가능 |

---

## 결과 기록

| TC | 날짜 | PASS/FAIL | 비고 |
|----|------|-----------|------|
| TC-01~09 | | | |
| TC-AI-01 prompt | | | |
| TC-AI-02 rag | | | |
| TC-AI-03 resume-ai | | | |
| TC-AI-04 api | | | |
| TC-AI-05 E2E | | | |
| TC-10 | | | |

**FAIL 시:** 서비스명, `docker compose logs <service>`, 요청 body, 응답 JSON, 스크린샷
