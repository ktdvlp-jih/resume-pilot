import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES, setLocale, type Locale } from '@/i18n';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const value = SUPPORTED_LOCALES.includes(i18n.language as Locale) ? i18n.language : 'ko';

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="sr-only">{t('language.label')}</Label>
      <Select value={value} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger className="w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((code) => (
            <SelectItem key={code} value={code}>{t(`language.${code}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
