type Detection = { sentence: string; level: string; reason: string };

export function HighlightedContent({ content, detections }: { content: string; detections: Detection[] }) {
  if (!detections.length) {
    return <p className="whitespace-pre-wrap text-base leading-loose text-foreground">{content}</p>;
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
    <p className="whitespace-pre-wrap text-base leading-loose text-foreground">
      {parts.map((p, i) =>
        p.level ? (
          <mark key={i} className="bg-transparent text-foreground" title={p.title}>
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}
