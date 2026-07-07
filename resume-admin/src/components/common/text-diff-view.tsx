import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DiffRow } from '@/lib/text-diff';

type TextDiffViewProps = {
  rows: DiffRow[];
  mode: 'split' | 'unified';
  labelA: string;
  labelB: string;
};

function LineNum({ n, muted }: { n?: number; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block w-10 shrink-0 select-none pr-3 text-right text-xs tabular-nums',
        muted ? 'text-transparent' : 'text-muted-foreground',
      )}
    >
      {n ?? ''}
    </span>
  );
}

function UnifiedRow({ row, index }: { row: DiffRow; index: number }) {
  if (row.kind === 'equal') {
    return (
      <div key={index} className="flex border-b border-border/40 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-muted-foreground"> </span>
        <span className="whitespace-pre-wrap break-all">{row.left}</span>
      </div>
    );
  }
  if (row.kind === 'delete') {
    return (
      <div key={index} className="flex border-b border-border/40 bg-destructive/10 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-destructive">-</span>
        <span className="whitespace-pre-wrap break-all">{row.left}</span>
      </div>
    );
  }
  if (row.kind === 'insert') {
    return (
      <div key={index} className="flex border-b border-border/40 bg-emerald-500/10 px-2 py-0.5">
        <LineNum n={row.rightNum} />
        <span className="w-4 shrink-0 text-emerald-600 dark:text-emerald-400">+</span>
        <span className="whitespace-pre-wrap break-all">{row.right}</span>
      </div>
    );
  }
  return (
    <>
      <div key={`${index}-old`} className="flex border-b border-border/40 bg-destructive/10 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-destructive">-</span>
        <span className="whitespace-pre-wrap break-all">{row.left}</span>
      </div>
      <div key={`${index}-new`} className="flex border-b border-border/40 bg-emerald-500/10 px-2 py-0.5">
        <LineNum n={row.rightNum} />
        <span className="w-4 shrink-0 text-emerald-600 dark:text-emerald-400">+</span>
        <span className="whitespace-pre-wrap break-all">{row.right}</span>
      </div>
    </>
  );
}

export function TextDiffView({ rows, mode, labelA, labelB }: TextDiffViewProps) {
  const { t } = useTranslation();

  if (mode === 'unified') {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">{t('prompts.unifiedView')}</div>
        <div className="overflow-x-auto font-mono text-sm">
          {rows.map((row, i) => (
            <UnifiedRow key={i} row={row} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 border-b bg-muted/50 text-sm font-medium">
        <div className="border-r px-4 py-2">{labelA}</div>
        <div className="px-4 py-2">{labelB}</div>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="overflow-x-auto border-r font-mono text-sm">
          {rows.map((row, i) => {
            const bg =
              row.kind === 'delete' || row.kind === 'change'
                ? 'bg-destructive/10'
                : row.kind === 'insert'
                  ? 'bg-muted/30'
                  : '';
            const num = row.kind === 'insert' ? undefined : row.leftNum;
            const text = row.kind === 'insert' ? '' : row.left;
            return (
              <div key={i} className={cn('flex border-b border-border/40 px-2 py-0.5', bg)}>
                <LineNum n={num} muted={row.kind === 'insert'} />
                <span className="whitespace-pre-wrap break-all">{text || ' '}</span>
              </div>
            );
          })}
        </div>
        <div className="overflow-x-auto font-mono text-sm">
          {rows.map((row, i) => {
            const bg =
              row.kind === 'insert' || row.kind === 'change'
                ? 'bg-emerald-500/10'
                : row.kind === 'delete'
                  ? 'bg-muted/30'
                  : '';
            const num = row.kind === 'delete' ? undefined : row.rightNum;
            const text = row.kind === 'delete' ? '' : row.right;
            return (
              <div key={i} className={cn('flex border-b border-border/40 px-2 py-0.5', bg)}>
                <LineNum n={num} muted={row.kind === 'delete'} />
                <span className="whitespace-pre-wrap break-all">{text || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
