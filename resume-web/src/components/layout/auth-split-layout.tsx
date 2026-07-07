import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

type AuthSplitLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function AuthSplitLayout({ children, title, subtitle }: AuthSplitLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-10 text-primary-foreground lg:flex [&_span]:text-primary-foreground">
        <Logo to="/" showText />
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-sm">
            <Sparkles className="size-4" />
            RAG · AI
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('app.name')}</h1>
          <p className="max-w-md text-primary-foreground/90">{t('landing.authPitch')}</p>
          <ul className="space-y-2 text-sm text-primary-foreground/85">
            {[t('landing.authBullet1'), t('landing.authBullet2'), t('landing.authBullet3')].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">
          <Link to="/" className="underline-offset-4 hover:underline">
            {t('landing.backHome')}
          </Link>
        </p>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <Logo to="/" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-1 text-center lg:text-left">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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
    <div className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}
