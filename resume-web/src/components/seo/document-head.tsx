import { useEffect } from 'react';
import { absoluteUrl } from '@/lib/site';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function DocumentHead({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}) {
  useEffect(() => {
    const fullTitle = title.includes('ResumePilot') ? title : `${title} · ResumePilot`;
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', absoluteUrl(path));
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', absoluteUrl(path));

    const google = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined;
    if (google?.trim()) upsertMeta('name', 'google-site-verification', google.trim());
    const naver = import.meta.env.VITE_NAVER_SITE_VERIFICATION as string | undefined;
    if (naver?.trim()) upsertMeta('name', 'naver-site-verification', naver.trim());
  }, [title, description, path, noIndex]);

  return null;
}
