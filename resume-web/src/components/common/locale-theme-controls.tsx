import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type LocaleThemeControlsProps = {
  className?: string;
  languageClassName?: string;
  showLanguage?: boolean;
  showTheme?: boolean;
  /** Hide language select below this breakpoint (header toolbar). */
  languageHiddenBelow?: 'sm' | 'md';
};

export function ThemeToggleButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function LocaleThemeControls({
  className,
  languageClassName,
  showLanguage = true,
  showTheme = true,
  languageHiddenBelow,
}: LocaleThemeControlsProps) {
  const langHiddenClass =
    languageHiddenBelow === 'sm'
      ? 'hidden sm:block'
      : languageHiddenBelow === 'md'
        ? 'hidden md:block'
        : '';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLanguage && (
        <LanguageSwitcher className={cn('w-28', langHiddenClass, languageClassName)} />
      )}
      {showTheme && <ThemeToggleButton />}
    </div>
  );
}
