# 비밀 정보 취급 (ResumePilot)

에이전트·사용자 모두 아래를 **채팅, 스크린샷, git 커밋, PR 본문**에 넣지 않는다.

## 절대 공유·반복·커밋 금지

| 종류 | 예 | 비고 |
|------|-----|------|
| **SSH 개인키** | `-----BEGIN OPENSSH PRIVATE KEY-----` | 공개키(`.pub`)만 등록용 |
| **GitHub PAT** | `ghp_…`, `github_pat_…` | revoke 후 재발급 |
| **`.env` 실값** | `JWT_SECRET`, `POSTGRES_PASSWORD`, `OPENAI_API_KEY` | `.env.example` / `.env.production.example`만 커밋 |
| **Cloudflare·Tailscale 키** | tunnel credentials, `tskey-auth-…` | |

## 에이전트 행동

- 사용자가 토큰·키를 붙여 넣으면 **값을 인용·재출력하지 않는다.**
- 문서·스크립트 예시는 `change-me`, 플레이스홀더만 사용한다.
- `git add .env` 시도는 거부·경고한다.
