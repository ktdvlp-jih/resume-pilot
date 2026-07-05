type Detection = { sentence: string; level: string; reason: string };

const LEVEL_CLASS: Record<string, string> = {
  GREEN: 'bg-green-100 dark:bg-green-950/60',
  YELLOW: 'bg-yellow-100 dark:bg-yellow-950/60',
  RED: 'bg-red-100 dark:bg-red-950/60',
};

export function HighlightedContent({ content, detections }: { content: string; detections: Detection[] }) {
  if (!detections.length) {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  let remaining = content;
  const parts: Array<{ text: string; level?: string; title?: string }> = [];

  for (const d of detections) {
    const idx = remaining.indexOf(d.sentence);
    if (idx === -1) continue;
    if (idx > 0) parts.push({ text: remaining.slice(0, idx) });
    parts.push({ text: d.sentence, level: d.level, title: d.reason });
    remaining = remaining.slice(idx + d.sentence.length);
  }
  if (remaining) parts.push({ text: remaining });

  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {parts.map((p, i) =>
        p.level ? (
          <mark key={i} className={`rounded px-0.5 ${LEVEL_CLASS[p.level] || ''}`} title={p.title}>
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}
