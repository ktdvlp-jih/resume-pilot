import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useIsXl } from '@/hooks/use-mobile';
import { PanelResizeHandle, useResizablePanels } from '@/hooks/use-resizable-panels';
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
  const isXl = useIsXl();
  const { widths, startResize, isResizing } = useResizablePanels();

  if (isXl === undefined) {
    return <div className={cn('-mx-4 md:-mx-6 lg:-mx-8 min-h-[calc(100svh-7rem)]', className)} />;
  }

  if (!isXl) {
    return (
      <div className={cn('-mx-4 md:-mx-6 lg:-mx-8', className)}>
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
    );
  }

  return (
    <div className={cn('-mx-4 md:-mx-6 lg:-mx-8', className)}>
      <div
        className={cn(
          'min-h-[calc(100svh-7rem)] grid border-y',
          isResizing && 'select-none',
        )}
        style={{
          gridTemplateColumns: `${widths.left}px 4px minmax(0, 1fr) 4px ${widths.right}px`,
        }}
      >
        <aside className="overflow-y-auto bg-muted/20 p-4">{left}</aside>
        <PanelResizeHandle onMouseDown={() => startResize('left')} />
        <main className="overflow-y-auto p-6">{center}</main>
        <PanelResizeHandle onMouseDown={() => startResize('right')} />
        <aside className="overflow-y-auto bg-muted/10 p-4">{right}</aside>
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
