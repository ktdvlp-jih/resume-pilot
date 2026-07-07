import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Moon, Search, Sun, User } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { clearTokens } from '@/lib/api';
import { useTheme } from '@/lib/theme';
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

export function AppHeader() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground md:flex"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <Search className="size-3.5" />
          <span className="text-xs">{t('command.shortcut')}</span>
        </Button>
        <LanguageSwitcher className="hidden w-28 sm:block" />
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="hidden sm:inline">{t('nav.groupAccount')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/settings">{t('nav.settings')}</Link>
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
