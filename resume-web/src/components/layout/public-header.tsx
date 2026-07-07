import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getAccessToken, clearTokens } from '@/lib/api';
import { publicHeaderLinks } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function PublicHeader() {
  const { t } = useTranslation();
  const isLoggedIn = !!getAccessToken();

  const authActions = isLoggedIn ? (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/dashboard">{t('nav.dashboard')}</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/settings">{t('nav.profile')}</Link>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          clearTokens();
          window.location.href = '/';
        }}
      >
        {t('nav.logout')}
      </Button>
    </>
  ) : (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">{t('auth.login')}</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/signup">{t('auth.signup')}</Link>
      </Button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Logo to="/" />

        <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.main')}>
          {publicHeaderLinks.map(({ href, labelKey }) => (
            <Button key={href} variant="ghost" size="sm" asChild>
              <a href={href}>{t(labelKey)}</a>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher className="w-32" />
          {authActions}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('nav.openMenu')}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{t('nav.menu')}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-2">
              <LanguageSwitcher />
              <Separator className="my-2" />
              {publicHeaderLinks.map(({ href, labelKey }) => (
                <Button key={href} variant="ghost" className="justify-start" asChild>
                  <a href={href}>{t(labelKey)}</a>
                </Button>
              ))}
              {isLoggedIn && (
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
              )}
              {isLoggedIn && (
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/settings">{t('nav.profile')}</Link>
                </Button>
              )}
              <Separator className="my-2" />
              {isLoggedIn ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    clearTokens();
                    window.location.href = '/';
                  }}
                >
                  {t('nav.logout')}
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login">{t('auth.login')}</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">{t('auth.signup')}</Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function AppFooter({ className }: { className?: string }) {
  const { t } = useTranslation();
  const links = [
    { href: '/#features', label: t('nav.features') },
    { href: '/#pricing', label: t('nav.pricing') },
    { href: '/login', label: t('auth.login') },
    { href: '/signup', label: t('auth.signup') },
  ];

  return (
    <footer className={cn('border-t py-10', className)}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 md:px-6">
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label={t('nav.main')}>
          {links.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <p className="text-center text-sm text-muted-foreground">{t('app.footer', { name: t('app.name') })}</p>
      </div>
    </footer>
  );
}
