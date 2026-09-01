import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Wallet } from 'lucide-react';
import { LocaleThemeControls } from '@/components/common/locale-theme-controls';
import { currentNavItem } from '@/config/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function AppHeader() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = currentNavItem(pathname);
  const walletQuery = useQuery({
    queryKey: ['billing-wallet'],
    queryFn: api.getBillingWallet,
    staleTime: 30_000,
  });

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger
        className="-ml-1 rounded-lg border border-border bg-background shadow-xs"
        aria-label={t('nav.toggleSidebar')}
      />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {current && (
        <span className="font-semibold tracking-tight">{t(current.labelKey)}</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {walletQuery.data && (
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link to="/settings?tab=wallet" aria-label={t('nav.billing')}>
              <Wallet data-icon="inline-start" />
              <Badge variant="secondary" className="font-normal">
                {walletQuery.data.tokenBalance}
              </Badge>
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground md:flex"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
          <Search data-icon="inline-start" />
          <span className="text-xs">{t('command.shortcut')}</span>
        </Button>
        <LocaleThemeControls languageHiddenBelow="sm" languageClassName="w-28" />
      </div>
    </header>
  );
}
