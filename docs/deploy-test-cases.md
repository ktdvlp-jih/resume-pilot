# ResumePilot 배포·기능 테스트 케이스

GitHub Actions `deploy.yml` (master push) 또는 `./scripts/resume-pilot.sh deploy` 실행 후 검증용 체크리스트.

> 마지막 업데이트: 2026-07-06 (경력 포트폴리오·다크모드·UI)

**접속 URL 예시**

| 환경 | URL |
|------|-----|
| LAN | `http://192.168.219.100:9180` |
| Quick Tunnel | `https://<subdomain>.trycloudflare.com` |

---

## TC-01 — Docker 컨테이너 (5개)

**실행 (서버 SSH)**

```bash
cd ~/apps/resume-pilot
docker compose ps
```

| # | 검증 | 기대 |
|---|------|------|
| 1 | `resume-pilot-app` | **Up** (Restarting 아님), `0.0.0.0:9180->8080` |
| 2 | `resume-pilot-postgres` | Up (healthy), `55532->5432` |
| 3 | `resume-pilot-ai` | Up, host 포트 없음 |
| 4 | `resume-pilot-prompt` | Up, host 포트 없음 |
| 5 | `resume-pilot-rag` | Up, host 포트 없음 |

**실패 시 로그**

```bash
docker compose logs app --tail 80
# Flyway 버전 중복, DB 연결 실패 등 확인
```

---

## TC-02 — HTTP 엔드포인트 (localhost)

```bash
APP_PORT=${APP_PORT:-9180}
curl -sfL -o /dev/null -w "swagger: %{http_code}\n" "http://localhost:${APP_PORT}/swagger-ui.html"
curl -s -o /dev/null -w "root: %{http_code}\n" "http://localhost:${APP_PORT}/"
curl -s -o /dev/null -w "admin: %{http_code}\n" "http://localhost:${APP_PORT}/admin/"
curl -s -o /dev/null -w "api: %{http_code}\n" "http://localhost:${APP_PORT}/api/v1/auth/login" \
  -X POST -H "Content-Type: application/json" -d '{}'
```

| # | URL | 기대 HTTP |
|---|-----|-----------|
| 1 | `/swagger-ui.html` | 200 |
| 2 | `/` | 200 |
| 3 | `/admin/` | 200 |
| 4 | `POST /api/v1/auth/login` (빈 body) | 400 (서버 응답 확인용) |

---

## TC-03 — GitHub Actions 자동 배포

| # | 검증 | 기대 |
|---|------|------|
| 1 | `master` push 후 Actions run 생성 | Deploy Docker (Ubuntu self-hosted) |
| 2 | Runner `ubuntu-server` | Running → 성공 |
| 3 | Deploy step | `resume-pilot.sh deploy` 성공 |
| 4 | Health check step | `curl -sfL .../swagger-ui.html` 성공 |

---

## TC-04 — 인증 (로그인·회원가입)

| # | 시나리오 | 단계 | 기대 |
|---|----------|------|------|
| 1 | 회원가입 | `/signup` → 이메일·비밀번호·이름 입력 → 가입 | 로그인 페이지 또는 대시보드 이동 |
| 2 | 로그인 | `/login` → 계정 입력 → 로그인 | `/dashboard` 이동, JWT 저장 |
| 3 | 로그아웃 | 사이드바 **로그아웃** 클릭 | `/login` 이동, 보호 라우트 접근 불가 |
| 4 | 미인증 접근 | 로그아웃 후 `/dashboard` 직접 입력 | `/login` 리다이렉트 |

---

## TC-05 — 다크모드

| # | 시나리오 | 단계 | 기대 |
|---|----------|------|------|
| 1 | 라이트 → 다크 | 사이드바 **다크모드** 클릭 | 배경·카드·텍스트가 어두운 테마로 전환 |
| 2 | 다크 → 라이트 | **라이트모드** 클릭 | 밝은 테마로 복귀 |
| 3 | 새로고침 유지 | 다크 상태에서 F5 | 다크모드 유지 (`localStorage.theme`) |
| 4 | 로그인 화면 | 다크 상태에서 로그아웃 | 로그인 폼도 다크 스타일 적용 |
| 5 | HTML 클래스 | DevTools → `<html>` | 다크 시 `class="dark"` 포함 |

---

## TC-06 — UI 인터랙션 (커서·호버)

| # | 대상 | 기대 |
|---|------|------|
| 1 | 사이드바 네비 링크 | 마우스 오버 시 **손가락(pointer)** 커서 |
| 2 | 다크모드 / 로그아웃 버튼 | pointer 커서, 호버 시 색상 변화 |
| 3 | 대시보드 **새 자소서** 링크 | pointer 커서 |
| 4 | 마이페이지 **저장** 버튼 | pointer 커서 |
| 5 | 비활성(disabled) 버튼 | `not-allowed` 커서 |
| 6 | 일반 텍스트 영역 | 기본 커서(arrow) 유지 |

---

## TC-07 — 마이페이지 · 경력 포트폴리오 입력

**경로:** `/settings` (사이드바 **마이페이지**)

| # | 시나리오 | 단계 | 기대 |
|---|----------|------|------|
| 1 | 탭 전환 | **경력 포트폴리오** / **계정** 탭 클릭 | 내용 전환, 완성도(%) 표시 |
| 2 | 경력 추가 | 경력 → 회사·직무·기간·상세 입력 → **포트폴리오 저장** | 저장 성공 메시지 |
| 3 | 학력 추가 | 학력 섹션 입력 후 저장 | 저장 후 새로고침해도 유지 |
| 4 | 스킬 추가 | 스킬명·카테고리·숙련도 추가 후 저장 | 유지 |
| 5 | 경력 기술서 | 자유 서술 입력 후 저장 | 유지 |
| 6 | 자소서 5섹션 | 5-1 ~ 5-5 각각 입력 후 저장 | 유지 |
| 7 | 완성도 | 항목 입력 시 | 탭 제목 옆 완성도 % 증가 |
| 8 | 계정 탭 | 이름·전화·소개 수정 후 저장 | 프로필 반영 |

**자소서 섹션 매핑**

| 섹션 | 내용 |
|------|------|
| 5-1 | 직무 경험 및 역량 |
| 5-2 | 협업 및 성과 |
| 5-3 | 성장과정·교우관계·가치관 |
| 5-4 | 성격의 장단점 |
| 5-5 | 지원동기 및 입사 포부 |

---

## TC-08 — 대시보드 · 경력 포트폴리오 오버뷰

**경로:** `/dashboard`

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | Bento 오버뷰 | 상단에 경력·학력·스킬·경력기술서·자소서 요약 카드 표시 |
| 2 | 완성도 | 마이페이지 입력 반영 시 완성도 바/퍼센트 갱신 |
| 3 | 편집 링크 | **마이페이지에서 편집** 클릭 → `/settings` 이동 |
| 4 | 빈 상태 | 미입력 시 | 빈 상태 안내 문구 표시 |
| 5 | 자소서 목록 | 하단 기존 이력서 카드 목록 | 생성·버전·삭제 링크 동작 |

---

## TC-09 — 기존 핵심 기능 (회귀)

| # | 시나리오 | 경로 | 기대 |
|---|----------|------|------|
| 1 | 경험 라이브러리 | `/experiences` | 목록·추가·수정 |
| 2 | 채용공고 | `/job-postings` | 목록·등록 |
| 3 | 문체 분석 | `/writing-style` | 페이지 로드 |
| 4 | 워크스페이스 | `/workspace` | 자소서 생성 플로우 진입 |
| 5 | 버전 비교 | 이력서 → 버전 | 2개 이상 버전 시 비교 |
| 6 | 언어 전환 | LanguageSwitcher | ko/en/ja/zh UI 텍스트 변경 |

---

## TC-10 — Quick Tunnel (선택)

| # | 검증 | 기대 |
|---|------|------|
| 1 | `sudo journalctl -u cloudflared-quick-resume -n 50` | `*.trycloudflare.com` URL 확인 |
| 2 | 브라우저에서 Tunnel URL 접속 | SPA 로드, assets 200 (403/MIME 오류 없음) |
| 3 | 로그인·대시보드 | LAN과 동일 동작 |

---

## TC-11 — API 스모크 (선택)

```bash
# 회원가입
curl -s -X POST "http://localhost:9180/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"tc@test.com","password":"password123","name":"TC User"}'

# 로그인 → 토큰
TOKEN=$(curl -s -X POST "http://localhost:9180/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tc@test.com","password":"password123"}' | jq -r '.data.accessToken')

# 경력 포트폴리오 PATCH
curl -s -X PATCH "http://localhost:9180/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"careerPortfolio":{"careers":[{"company":"테스트","position":"개발"}],"educations":[],"skills":[],"careerStatement":"요약","coverLetter":{}}}'

# GET me — careerPortfolio 포함 확인
curl -s "http://localhost:9180/api/v1/users/me" -H "Authorization: Bearer $TOKEN" | jq '.data.careerPortfolio'
```

| # | API | 기대 |
|---|-----|------|
| 1 | `PATCH /api/v1/users/me` | 200, `careerPortfolio` 저장 |
| 2 | `GET /api/v1/users/me` | `careerPortfolio.careers[0].company` = "테스트" |

---

## 결과 기록

| TC | 날짜 | 결과 (PASS/FAIL) | 비고 |
|----|------|------------------|------|
| TC-01 | | | |
| TC-02 | | | |
| TC-03 | | | |
| TC-04 | | | |
| TC-05 | | | |
| TC-06 | | | |
| TC-07 | | | |
| TC-08 | | | |
| TC-09 | | | |
| TC-10 | | | |
| TC-11 | | | |

**FAIL 시 기록:** 브라우저, URL, 스크린샷, `docker compose logs app` 일부
