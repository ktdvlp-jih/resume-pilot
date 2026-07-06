import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <span className="font-semibold tracking-tight">{t('admin.title')}</span>
      <div className="ml-auto">
        <Button variant="ghost" size="sm" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer" className="gap-2">
            {t('admin.backToApp', { defaultValue: 'ResumePilot' })}
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
    </header>
  );
}
