import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

export const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'locale';

export function resolveLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('zh')) return 'zh';
  return 'en';
}

export function setLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  void i18n.changeLanguage(locale);
}

void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
    ja: { translation: ja },
    zh: { translation: zh },
  },
  lng: resolveLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

export const EXPERIENCE_TYPES = [
  'PROJECT', 'ACHIEVEMENT', 'CAREER', 'EDUCATION', 'CERTIFICATION',
  'COLLABORATION', 'CONFLICT_RESOLUTION', 'PROBLEM_SOLVING', 'LEADERSHIP', 'TECHNOLOGY', 'OTHER',
] as const;
