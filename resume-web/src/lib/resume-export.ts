export function downloadPlainText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function printPlainText(title: string, content: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  w.document.write(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Pretendard, "Apple SD Gothic Neo", sans-serif; margin: 32px; line-height: 1.75; white-space: pre-wrap; word-break: keep-all; }
    h1 { font-size: 1.25rem; margin: 0 0 1.5rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div>${escapeHtml(content)}</div>
</body>
</html>`);
  w.document.close();
  w.focus();
  w.print();
}

export function countChars(text: string) {
  const withSpaces = [...text].length;
  const withoutSpaces = [...text.replace(/\s/g, '')].length;
  const bytes = new TextEncoder().encode(text).length;
  return { withSpaces, withoutSpaces, bytes };
}
