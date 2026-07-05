import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, setLocale, type Locale } from '../i18n';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation();

  return (
    <select
      aria-label={t('language.label')}
      value={SUPPORTED_LOCALES.includes(i18n.language as Locale) ? i18n.language : 'ko'}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className={`text-sm px-2 py-1 rounded-lg border ui-select ${className}`}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {t(`language.${code}`)}
        </option>
      ))}
    </select>
  );
}
