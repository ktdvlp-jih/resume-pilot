import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LocaleThemeControls } from '@/components/common/locale-theme-controls';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

type AuthSplitLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

/** 로그인·가입 등 인증 전용 레이아웃 (소개 패널 없음) */
export function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 p-4 sm:px-6">
        <Logo to="/" variant="public" />
        <LocaleThemeControls languageClassName="w-32" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-pretty text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="underline-offset-4 hover:underline">
              {t('landing.backHome')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export function AuthFormCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
