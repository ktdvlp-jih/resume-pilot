import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { LocaleThemeControls } from '@/components/common/locale-theme-controls';
import { Logo } from '@/components/Logo';
import { brandSurfaceClass, brandSurfaceMutedClass, brandSurfaceSubtleClass } from '@/lib/brand-surface';
import { cn } from '@/lib/utils';

type AuthSplitLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <div
        className={cn(
          'relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-10 lg:flex',
          brandSurfaceClass,
        )}
      >
        <Logo to="/" showText variant="brand" />
        <div className="space-y-4">
          <div className={cn('inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm', brandSurfaceMutedClass)}>
            <Sparkles className="size-4" />
            RAG · AI
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
          <p className={cn('max-w-md', brandSurfaceMutedClass)}>{t('landing.authPitch')}</p>
          <ul className={cn('space-y-2 text-sm', brandSurfaceMutedClass)}>
            {[t('landing.authBullet1'), t('landing.authBullet2'), t('landing.authBullet3')].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-white" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className={cn('text-xs', brandSurfaceSubtleClass)}>
          <Link to="/" className="underline-offset-4 hover:underline">
            {t('landing.backHome')}
          </Link>
        </p>
      </div>
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="lg:hidden">
            <Logo to="/" variant="public" />
          </div>
          <LocaleThemeControls className="ml-auto" languageClassName="w-32" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6 pt-0">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-1 text-center lg:text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-pretty text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
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
