export function resolveApiUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  return '';
}
