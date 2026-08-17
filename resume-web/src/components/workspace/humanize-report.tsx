import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { StatusChip } from '@/components/common/status-chip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type HumanizeFinding = {
  pattern?: number | null;
  severity?: string;
  title?: string;
  example?: string;
  why?: string;
};

export type HumanizeReplacement = {
  original?: string;
  revised?: string;
  reason?: string;
};

export type HumanizeAnalysis = {
  grade?: string;
  grade_reason?: string;
  s1?: number;
  s2?: number;
  s3?: number;
  findings?: HumanizeFinding[];
};

const SEVERITY_VARIANT: Record<string, 'default' | 'warning' | 'destructive'> = {
  S1: 'destructive',
  S2: 'warning',
  S3: 'default',
};

export function HumanizeSummary({ analysis }: { analysis?: HumanizeAnalysis | null }) {
  const { t } = useTranslation();
  if (!analysis) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">
        {t('workspace.humanizeReportSummary', {
          s1: analysis.s1 ?? 0,
          s2: analysis.s2 ?? 0,
          s3: analysis.s3 ?? 0,
        })}
      </p>
      {analysis.grade ? (
        <p className="text-sm">
          {t('workspace.humanizeGrade', { grade: analysis.grade })}
          {analysis.grade_reason ? ` — ${analysis.grade_reason}` : ''}
        </p>
      ) : null}
    </div>
  );
}

export function HumanizeFindingsList({ findings }: { findings: HumanizeFinding[] }) {
  const { t } = useTranslation();
  if (findings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {findings.map((f, i) => (
        <div key={`${f.pattern ?? 'p'}-${i}`} className="rounded-md border bg-muted/20 p-3 text-sm">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusChip
              label={f.severity || 'S2'}
              variant={SEVERITY_VARIANT[f.severity ?? ''] ?? 'warning'}
            />
            <span className="font-medium">
              {f.pattern != null
                ? t('workspace.humanizePattern', { n: f.pattern, title: f.title ?? '' })
                : f.title}
            </span>
          </div>
          {f.example ? <p className="leading-relaxed text-muted-foreground">「{f.example}」</p> : null}
          {f.why ? <p className="mt-1.5 text-xs text-muted-foreground">{f.why}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function HumanizeReplacementList({ replacements }: { replacements: HumanizeReplacement[] }) {
  const { t } = useTranslation();
  if (replacements.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {replacements.map((r, i) => (
        <div key={`${r.original ?? i}-${i}`} className="rounded-md border p-3 text-sm">
          {r.reason ? <p className="mb-2 text-xs text-muted-foreground">{r.reason}</p> : null}
          <div className="flex flex-col gap-2">
            <div className="rounded-md bg-destructive/10 px-2.5 py-2">
              <p className="mb-1 text-[11px] font-medium text-destructive">{t('workspace.humanizeOriginal')}</p>
              <p className="leading-relaxed text-pretty">{r.original}</p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ArrowRight className="size-3.5" />
              <span className="text-[11px]">{t('workspace.humanizeRevised')}</span>
            </div>
            <div className="rounded-md bg-success/10 px-2.5 py-2">
              <p className="leading-relaxed text-pretty">{r.revised}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type HumanizeReportProps = {
  analysis?: HumanizeAnalysis | null;
  findings: HumanizeFinding[];
  replacements?: HumanizeReplacement[];
  variant?: 'full' | 'compare';
  onOpenDiagnosis?: () => void;
  className?: string;
};

export function HumanizeReport({
  analysis,
  findings,
  replacements = [],
  variant = 'full',
  onOpenDiagnosis,
  className,
}: HumanizeReportProps) {
  const { t } = useTranslation();
  const show = findings.length > 0 || replacements.length > 0 || Boolean(analysis?.grade);
  if (!show) return null;

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-md border p-3', className)}
      data-testid={variant === 'compare' ? 'workspace-humanize-compare' : 'workspace-humanize-report'}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {t(variant === 'compare' ? 'workspace.humanizeCompareTitle' : 'workspace.humanizeReportTitle')}
          </p>
          <HumanizeSummary analysis={analysis} />
        </div>
        {variant === 'compare' && onOpenDiagnosis ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onOpenDiagnosis}>
            {t('workspace.humanizeOpenDiagnosis')}
          </Button>
        ) : null}
      </div>
      {variant === 'compare' ? null : (
        <>
          <HumanizeReplacementList replacements={replacements} />
          <HumanizeFindingsList findings={findings} />
        </>
      )}
    </div>
  );
}
