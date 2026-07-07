import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelLeft, PanelRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type WorkspaceLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  className?: string;
};

export function WorkspaceLayout({ left, center, right, className }: WorkspaceLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className={cn('-mx-4 md:-mx-6 lg:-mx-8', className)}>
      {/* Mobile / tablet: tabbed panels */}
      <div className="xl:hidden">
        <Tabs defaultValue="center" className="flex flex-col">
          <TabsList className="mx-4 mt-1 grid w-auto grid-cols-3 md:mx-6">
            <TabsTrigger value="left">{t('workspace.panelSetup')}</TabsTrigger>
            <TabsTrigger value="center">{t('workspace.panelEditor')}</TabsTrigger>
            <TabsTrigger value="right">{t('workspace.panelResults')}</TabsTrigger>
          </TabsList>
          <TabsContent value="left" className="mt-0 border-t p-4 md:p-6">
            {left}
          </TabsContent>
          <TabsContent value="center" className="mt-0 border-t p-4 md:p-6">
            {center}
          </TabsContent>
          <TabsContent value="right" className="mt-0 border-t p-4 md:p-6">
            {right}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: 3-pane */}
      <div className="hidden min-h-[calc(100svh-7rem)] xl:grid xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:border-y">
        <aside className="overflow-y-auto border-r bg-muted/20 p-4">{left}</aside>
        <main className="overflow-y-auto p-6">{center}</main>
        <aside className="overflow-y-auto border-l bg-muted/10 p-4">{right}</aside>
      </div>
    </div>
  );
}

export function WorkspacePanelTitle({ icon: Icon, children }: { icon?: typeof Sparkles; children: ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight text-muted-foreground uppercase">
      {Icon && <Icon className="size-4" />}
      {children}
    </h2>
  );
}

/** Compact triggers for md-only (optional enhancement) */
export function WorkspaceMobileActions({ left, right }: { left: ReactNode; right: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="hidden md:flex xl:hidden gap-2 mb-4 px-4 md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <PanelLeft className="size-4" />
            {t('workspace.panelSetup')}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>{t('workspace.panelSetup')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{left}</div>
        </SheetContent>
      </Sheet>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <PanelRight className="size-4" />
            {t('workspace.panelResults')}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>{t('workspace.panelResults')}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{right}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
