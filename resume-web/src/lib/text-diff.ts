export type DiffRow =
  | { kind: 'equal'; left: string; right: string; leftNum: number; rightNum: number }
  | { kind: 'delete'; left: string; leftNum: number }
  | { kind: 'insert'; right: string; rightNum: number }
  | { kind: 'change'; left: string; right: string; leftNum: number; rightNum: number };

export type InlinePart = { type: 'eq' | 'del' | 'ins'; text: string };

function lcsTable(a: string[], b: string[]) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function lcsLength(a: string[], b: string[]): number {
  const dp = lcsTable(a, b);
  return dp[a.length][b.length];
}

/** 문단은 유지하고, 문장 단위로 나눠 같은 문장은 색을 칠하지 않는다. */
export function splitDiffUnits(text: string): string[] {
  const units: string[] = [];
  for (const line of text.split('\n')) {
    if (line === '') {
      units.push('');
      continue;
    }
    const sentences = line.match(/[^.?!。！？]+[.?!。！？]*\s*/g);
    if (!sentences || sentences.length <= 1) {
      units.push(line);
      continue;
    }
    units.push(...sentences.map((s) => s.trimEnd()).filter((s) => s.length > 0));
  }
  return units;
}

export function diffText(a: string, b: string): DiffRow[] {
  const left = splitDiffUnits(a);
  const right = splitDiffUnits(b);
  const dp = lcsTable(left, right);
  const stack: DiffRow[] = [];
  let i = left.length;
  let j = right.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      stack.push({
        kind: 'equal',
        left: left[i - 1],
        right: right[j - 1],
        leftNum: i,
        rightNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ kind: 'insert', right: right[j - 1], rightNum: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      stack.push({ kind: 'delete', left: left[i - 1], leftNum: i });
      i--;
    }
  }

  stack.reverse();

  const rows: DiffRow[] = [];
  for (let k = 0; k < stack.length; k++) {
    const row = stack[k];
    const next = stack[k + 1];
    if (row.kind === 'delete' && next?.kind === 'insert') {
      rows.push({
        kind: 'change',
        left: row.left,
        right: next.right,
        leftNum: row.leftNum,
        rightNum: next.rightNum,
      });
      k++;
    } else {
      rows.push(row);
    }
  }

  return rows;
}

export function diffInline(a: string, b: string): InlinePart[] {
  if (a === b) return a ? [{ type: 'eq', text: a }] : [];
  if (!a) return b ? [{ type: 'ins', text: b }] : [];
  if (!b) return [{ type: 'del', text: a }];

  const left = Array.from(a);
  const right = Array.from(b);
  const dp = lcsTable(left, right);
  const raw: InlinePart[] = [];
  let i = left.length;
  let j = right.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      raw.push({ type: 'eq', text: left[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.push({ type: 'ins', text: right[j - 1] });
      j--;
    } else {
      raw.push({ type: 'del', text: left[i - 1] });
      i--;
    }
  }

  raw.reverse();
  const parts: InlinePart[] = [];
  for (const part of raw) {
    const last = parts[parts.length - 1];
    if (last && last.type === part.type) last.text += part.text;
    else parts.push({ ...part });
  }
  return parts;
}

/** 글자가 거의 다르면 글자 단위 하이라이트 대신 문장 통째 표시 */
export function shouldInlineHighlight(left: string, right: string): boolean {
  const a = Array.from(left);
  const b = Array.from(right);
  const max = Math.max(a.length, b.length, 1);
  return lcsLength(a, b) / max >= 0.35;
}

export function countChangedLines(rows: DiffRow[]) {
  return rows.filter((r) => r.kind !== 'equal').length;
}

type ReplacementLike = { original?: string; revised?: string };

function fromReplacements(before: string, replacements: ReplacementLike[]): InlinePart[] | null {
  const hits: Array<{ original: string; revised: string; at: number }> = [];
  let searchFrom = 0;
  for (const item of replacements) {
    const original = String(item.original ?? '');
    const revised = String(item.revised ?? '');
    if (!original || original === revised) continue;
    let at = before.indexOf(original, searchFrom);
    if (at === -1) at = before.indexOf(original);
    if (at === -1) continue;
    hits.push({ original, revised, at });
    searchFrom = at + original.length;
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.at - b.at);

  const segs: InlinePart[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.at < cursor) continue;
    if (hit.at > cursor) segs.push({ type: 'eq', text: before.slice(cursor, hit.at) });
    segs.push({ type: 'del', text: hit.original });
    if (hit.revised) segs.push({ type: 'ins', text: hit.revised });
    cursor = hit.at + hit.original.length;
  }
  if (cursor < before.length) segs.push({ type: 'eq', text: before.slice(cursor) });
  return segs;
}

/** 자소서처럼 한 글로 흐르게. 바뀐 구절만 del/ins로 표시 (맞춤법 검사기 방식). */
export function buildProseDiff(
  before: string,
  after: string,
  replacements: ReplacementLike[] = [],
): InlinePart[] {
  const fromHits = fromReplacements(before, replacements);
  if (fromHits) return fromHits;
  return diffInline(before, after);
}
