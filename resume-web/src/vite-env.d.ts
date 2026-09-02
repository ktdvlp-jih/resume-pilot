/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string;
  readonly VITE_NAVER_SITE_VERIFICATION?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_CONTACT_EMAIL?: string;
}
