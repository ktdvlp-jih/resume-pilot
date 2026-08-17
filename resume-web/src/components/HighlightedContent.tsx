import { cn } from '@/lib/utils';

export type Detection = { sentence: string; level: string; reason: string };

const MARK_CLASS: Record<string, string> = {
  RED: 'rounded-sm bg-destructive/15',
  YELLOW: 'rounded-sm bg-warning/15',
  GREEN: 'rounded-sm bg-success/15',
};

type Mark = { start: number; end: number; level: string; title?: string };

function collectMarks(content: string, detections: Detection[]): Mark[] {
  const found: Mark[] = [];
  for (const d of detections) {
    const needle = d.sentence?.trim();
    if (!needle) continue;
    let from = 0;
    while (from < content.length) {
      const idx = content.indexOf(needle, from);
      if (idx === -1) break;
      found.push({
        start: idx,
        end: idx + needle.length,
        level: d.level,
        title: d.reason,
      });
      from = idx + needle.length;
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Mark[] = [];
  let cursor = 0;
  for (const m of found) {
    if (m.start < cursor) continue;
    kept.push(m);
    cursor = m.end;
  }
  return kept;
}

export function HighlightedContent({ content, detections }: { content: string; detections: Detection[] }) {
  if (!detections.length) {
    return <p className="whitespace-pre-wrap text-pretty text-base leading-loose text-foreground">{content}</p>;
  }

  const marks = collectMarks(content, detections);
  if (marks.length === 0) {
    return <p className="whitespace-pre-wrap text-pretty text-base leading-loose text-foreground">{content}</p>;
  }

  const parts: Array<{ text: string; level?: string; title?: string }> = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) parts.push({ text: content.slice(cursor, m.start) });
    parts.push({ text: content.slice(m.start, m.end), level: m.level, title: m.title });
    cursor = m.end;
  }
  if (cursor < content.length) parts.push({ text: content.slice(cursor) });

  return (
    <p className="whitespace-pre-wrap text-pretty text-base leading-loose text-foreground">
      {parts.map((p, i) =>
        p.level ? (
          <mark
            key={i}
            className={cn('text-foreground', MARK_CLASS[p.level] ?? 'rounded-sm bg-muted')}
            title={p.title}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}
