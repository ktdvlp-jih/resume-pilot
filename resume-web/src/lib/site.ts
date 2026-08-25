export const SITE_ORIGIN = 'https://resume.ggury.com';

export function siteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return SITE_ORIGIN;
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${suffix}`;
}
