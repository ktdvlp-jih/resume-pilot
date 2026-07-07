import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

/** CSS-only product preview mock (Vercel-style hero visual) */
export function ProductPreview() {
  const { t } = useTranslation();

  return (
    <div className="relative mx-auto mt-12 max-w-4xl">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-border/50">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/80" />
          <span className="size-2.5 rounded-full bg-warning/80" />
          <span className="size-2.5 rounded-full bg-success/80" />
          <span className="ml-2 text-xs text-muted-foreground">{t('app.name')} — {t('nav.workspace')}</span>
        </div>
        <div className="grid gap-0 md:grid-cols-[180px_1fr_160px] min-h-[280px] text-xs">
          <div className="hidden border-r bg-muted/20 p-3 md:block space-y-2">
            <p className="font-medium text-muted-foreground">{t('workspace.panelSetup')}</p>
            <div className="h-8 rounded-md bg-background border" />
            <div className="h-16 rounded-md bg-background border" />
            <div className="h-6 rounded-md bg-primary/20" />
          </div>
          <div className="p-4 space-y-2">
            <Badge variant="secondary" className="text-[10px]">{t('workspace.panelEditor')}</Badge>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-[92%] rounded bg-muted" />
              <div className="h-3 w-[80%] rounded bg-muted" />
              <div className="h-3 w-full rounded bg-primary/15" />
              <div className="h-3 w-[85%] rounded bg-muted" />
            </div>
            <div className="mt-4 h-8 w-32 rounded-md bg-primary/90" />
          </div>
          <div className="hidden border-l bg-muted/10 p-3 md:block space-y-2">
            <p className="font-medium text-muted-foreground">{t('workspace.panelResults')}</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="h-10 rounded bg-background border text-center pt-2 font-semibold">87</div>
              <div className="h-10 rounded bg-background border text-center pt-2 font-semibold">92</div>
            </div>
            <div className="h-12 rounded-md bg-background border" />
          </div>
        </div>
      </div>
    </div>
  );
}
