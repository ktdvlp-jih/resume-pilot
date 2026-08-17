import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { diffInline, shouldInlineHighlight, type DiffRow, type InlinePart } from '@/lib/text-diff';

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

function InlineMarks({ parts, side }: { parts: InlinePart[]; side: 'left' | 'right' | 'both' }) {
  return (
    <span className="whitespace-pre-wrap wrap-break-word">
      {parts.map((part, i) => {
        if (part.type === 'eq') return <span key={i}>{part.text}</span>;
        if ((side === 'left' || side === 'both') && part.type === 'del') {
          return (
            <mark key={i} className="rounded-sm bg-destructive/25 text-foreground">
              {part.text}
            </mark>
          );
        }
        if ((side === 'right' || side === 'both') && part.type === 'ins') {
          return (
            <mark key={i} className="rounded-sm bg-success/25 text-foreground">
              {part.text}
            </mark>
          );
        }
        return null;
      })}
    </span>
  );
}

function rowText(row: DiffRow, side: 'left' | 'right'): string {
  if (side === 'left') {
    if (row.kind === 'insert') return '';
    return row.left;
  }
  if (row.kind === 'delete') return '';
  return row.right;
}

function SplitCell({ row, side }: { row: DiffRow; side: 'left' | 'right' }) {
  const text = rowText(row, side);
  const isEmptySide =
    (side === 'left' && row.kind === 'insert') || (side === 'right' && row.kind === 'delete');
  const inline =
    row.kind === 'change' && shouldInlineHighlight(row.left, row.right)
      ? diffInline(row.left, row.right)
      : null;
  const bg =
    inline
      ? ''
      : row.kind === 'equal'
        ? ''
        : isEmptySide
          ? 'bg-muted/30'
          : side === 'left'
            ? row.kind === 'delete' || row.kind === 'change'
              ? 'bg-destructive/10'
              : ''
            : row.kind === 'insert' || row.kind === 'change'
              ? 'bg-success/10'
              : '';
  const num = isEmptySide
    ? undefined
    : side === 'left'
      ? row.kind === 'insert'
        ? undefined
        : row.leftNum
      : row.kind === 'delete'
        ? undefined
        : row.rightNum;

  return (
    <div className={cn('flex border-b border-border/40 px-2 py-0.5', bg)}>
      <LineNum n={num} muted={isEmptySide} />
      {inline ? (
        <InlineMarks parts={inline} side={side} />
      ) : (
        <span className="whitespace-pre-wrap wrap-break-word">{text || ' '}</span>
      )}
    </div>
  );
}

function UnifiedRow({ row, index }: { row: DiffRow; index: number }) {
  if (row.kind === 'equal') {
    return (
      <div key={index} className="flex border-b border-border/40 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-muted-foreground"> </span>
        <span className="whitespace-pre-wrap wrap-break-word">{row.left}</span>
      </div>
    );
  }
  if (row.kind === 'delete') {
    return (
      <div key={index} className="flex border-b border-border/40 bg-destructive/10 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-destructive">-</span>
        <span className="whitespace-pre-wrap wrap-break-word">{row.left}</span>
      </div>
    );
  }
  if (row.kind === 'insert') {
    return (
      <div key={index} className="flex border-b border-border/40 bg-success/10 px-2 py-0.5">
        <LineNum n={row.rightNum} />
        <span className="w-4 shrink-0 text-success">+</span>
        <span className="whitespace-pre-wrap wrap-break-word">{row.right}</span>
      </div>
    );
  }
  if (shouldInlineHighlight(row.left, row.right)) {
    const parts = diffInline(row.left, row.right);
    return (
      <div key={index} className="flex border-b border-border/40 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-muted-foreground">~</span>
        <InlineMarks parts={parts} side="both" />
      </div>
    );
  }
  return (
    <>
      <div key={`${index}-old`} className="flex border-b border-border/40 bg-destructive/10 px-2 py-0.5">
        <LineNum n={row.leftNum} />
        <span className="w-4 shrink-0 text-destructive">-</span>
        <span className="whitespace-pre-wrap wrap-break-word">{row.left}</span>
      </div>
      <div key={`${index}-new`} className="flex border-b border-border/40 bg-success/10 px-2 py-0.5">
        <LineNum n={row.rightNum} />
        <span className="w-4 shrink-0 text-success">+</span>
        <span className="whitespace-pre-wrap wrap-break-word">{row.right}</span>
      </div>
    </>
  );
}

export function DiffColorLegend() {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0 rounded-sm bg-destructive/50" aria-hidden />
        {t('versionCompare.legendRemoved')}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0 rounded-sm bg-success/50" aria-hidden />
        {t('versionCompare.legendAdded')}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 shrink-0 rounded-sm border border-border bg-background" aria-hidden />
        {t('versionCompare.legendUnchanged')}
      </li>
    </ul>
  );
}

export function TextDiffView({ rows, mode, labelA, labelB }: TextDiffViewProps) {
  const { t } = useTranslation();

  if (mode === 'unified') {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
          <p className="text-sm font-medium">{t('versionCompare.unifiedView')}</p>
          <DiffColorLegend />
        </div>
        <div className="overflow-x-auto text-sm">
          {rows.map((row, i) => (
            <UnifiedRow key={i} row={row} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center justify-end border-b bg-muted/50 px-4 py-2">
        <DiffColorLegend />
      </div>
      <div className="grid grid-cols-2 border-b bg-muted/50 text-sm font-medium">
        <div className="border-r px-4 py-2">{labelA}</div>
        <div className="px-4 py-2">{labelB}</div>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="overflow-x-auto border-r text-sm">
          {rows.map((row, i) => (
            <SplitCell key={`l-${i}`} row={row} side="left" />
          ))}
        </div>
        <div className="overflow-x-auto text-sm">
          {rows.map((row, i) => (
            <SplitCell key={`r-${i}`} row={row} side="right" />
          ))}
        </div>
      </div>
    </div>
  );
}
