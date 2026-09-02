/** 로컬 개발용 OAuth callback URL 예시 — 운영은 모달 「현재 API 기준」 URL 사용 */
export const OAUTH_REDIRECT_TEMPLATES = {
  notion: 'http://localhost:8080/api/v1/experiences/import/notion/oauth/callback',
  github: 'http://localhost:8080/api/v1/experiences/import/github/oauth/callback',
  googleLogin: 'http://localhost:8080/api/v1/auth/oauth/google/callback',
  kakaoLogin: 'http://localhost:8080/api/v1/auth/oauth/kakao/callback',
} as const;
