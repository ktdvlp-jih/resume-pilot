/** Dev: VITE_API_URL (Docker 등) 우선. 그 외엔 상대 경로 → Vite 프록시(same-origin). Prod: 빈 값 → 상대 /api/... */
export function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  return '';
}
