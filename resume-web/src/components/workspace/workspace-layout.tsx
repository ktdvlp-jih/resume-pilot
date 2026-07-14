import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useIsXl } from '@/hooks/use-mobile';
import { PanelResizeHandle, useResizablePanels } from '@/hooks/use-resizable-panels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type WorkspaceLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
};

/**
 * 좌: 입력·조작 패널 / 우: 결과·진단 패널 2분할 레이아웃.
 * xl 미만에서는 2개 탭(입력/결과)으로 전환된다.
 */
export function WorkspaceLayout({ left, right, className }: WorkspaceLayoutProps) {
  const { t } = useTranslation();
  const isXl = useIsXl();
  const { leftWidth, startResize, isResizing } = useResizablePanels();

  if (isXl === undefined) {
    return <div className={cn('-mx-4 md:-mx-6 lg:-mx-8 min-h-[calc(100svh-7rem)]', className)} />;
  }

  if (!isXl) {
    return (
      <div className={cn('-mx-4 md:-mx-6 lg:-mx-8', className)}>
        <Tabs defaultValue="left" className="flex flex-col">
          <TabsList className="mx-4 mt-1 grid w-auto grid-cols-2 md:mx-6">
            <TabsTrigger value="left">{t('workspace.panelInput')}</TabsTrigger>
            <TabsTrigger value="right">{t('workspace.panelResults')}</TabsTrigger>
          </TabsList>
          <TabsContent value="left" className="mt-0 border-t p-4 md:p-6">
            {left}
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
        className={cn('min-h-[calc(100svh-7rem)] grid border-y', isResizing && 'select-none')}
        style={{ gridTemplateColumns: `${leftWidth}px 4px minmax(0, 1fr)` }}
      >
        <aside className="overflow-y-auto bg-muted/20 p-6">{left}</aside>
        <PanelResizeHandle onMouseDown={startResize} />
        <main className="overflow-hidden">{right}</main>
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
