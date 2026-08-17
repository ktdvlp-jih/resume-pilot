import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { DiffColorLegend } from '@/components/common/text-diff-view';
import { buildProseDiff, type InlinePart } from '@/lib/text-diff';

type ReplacementLike = { original?: string; revised?: string };

function DelText({ children }: { children: ReactNode }) {
  return (
    <del className="rounded-sm bg-destructive/20 px-0.5 text-foreground line-through decoration-destructive">
      {children}
    </del>
  );
}

function InsText({ children }: { children: ReactNode }) {
  return (
    <ins className="rounded-sm bg-success/20 px-0.5 text-foreground no-underline">
      {children}
    </ins>
  );
}

function ChangePair({ original, revised }: { original: string; revised: string }) {
  const { t } = useTranslation();
  return (
    <HoverCard openDelay={80} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span className="cursor-help">
          <DelText>{original}</DelText>
          {original && revised ? ' ' : null}
          {revised ? <InsText>{revised}</InsText> : null}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 max-w-[min(20rem,calc(100vw-2rem))]" side="top" align="start">
        <div className="flex flex-col gap-2 text-sm">
          <div>
            <p className="mb-1 text-[11px] font-medium text-destructive">{t('workspace.humanizeOriginal')}</p>
            <p className="leading-relaxed text-pretty">{original}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-success">{t('workspace.humanizeRevised')}</p>
            <p className="leading-relaxed text-pretty">{revised}</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function renderSegments(parts: InlinePart[]) {
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    if (part.type === 'del' && next?.type === 'ins') {
      nodes.push(
        <ChangePair key={`c-${i}`} original={part.text} revised={next.text} />,
      );
      i += 1;
      continue;
    }
    if (part.type === 'eq') {
      nodes.push(<span key={`e-${i}`}>{part.text}</span>);
      continue;
    }
    if (part.type === 'del') {
      nodes.push(
        <ChangePair key={`d-${i}`} original={part.text} revised="" />,
      );
      continue;
    }
    nodes.push(<InsText key={`i-${i}`}>{part.text}</InsText>);
  }
  return nodes;
}

export function ProseDiffView({
  before,
  after,
  replacements = [],
}: {
  before: string;
  after: string;
  replacements?: ReplacementLike[];
}) {
  const { t } = useTranslation();
  const parts = useMemo(
    () => buildProseDiff(before, after, replacements),
    [before, after, replacements],
  );

  return (
    <div className="overflow-hidden rounded-lg border" data-testid="workspace-humanize-prose-diff">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2">
        <p className="text-xs text-muted-foreground">{t('workspace.humanizeProseHint')}</p>
        <DiffColorLegend />
      </div>
      <div className="px-4 py-4 text-base leading-loose text-pretty whitespace-pre-wrap">
        {renderSegments(parts)}
      </div>
    </div>
  );
}
