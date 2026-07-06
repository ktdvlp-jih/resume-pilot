import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearTokens } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { appHeaderNav, isNavActive } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Separator orientation="vertical" className="mr-1 h-4 md:hidden" />

      <Logo to="/" className="mr-2" />

      <nav className="hidden flex-1 items-center gap-0.5 lg:flex" aria-label={t('nav.main')}>
        {appHeaderNav.map((item) => (
          <Button
            key={item.to}
            variant="ghost"
            size="sm"
            asChild
            className={cn(isNavActive(pathname, item) && 'bg-accent text-accent-foreground')}
          >
            <Link to={item.to}>{t(item.labelKey)}</Link>
          </Button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher className="hidden w-28 sm:block" />
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="hidden sm:inline">{t('nav.profile')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/settings">{t('nav.settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard">{t('nav.dashboard')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                clearTokens();
                window.location.href = '/';
              }}
            >
              <LogOut className="size-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
