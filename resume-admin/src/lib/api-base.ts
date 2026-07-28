export function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    // 127.0.0.1:5174 로 연 경우 localhost:8080 과 호스트를 맞춰 CORS/세션 혼선을 줄인다.
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:8080`;
  }
  return '';
}
