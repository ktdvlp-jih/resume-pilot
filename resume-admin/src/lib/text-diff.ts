export type DiffRow =
  | { kind: 'equal'; left: string; right: string; leftNum: number; rightNum: number }
  | { kind: 'delete'; left: string; leftNum: number }
  | { kind: 'insert'; right: string; rightNum: number }
  | { kind: 'change'; left: string; right: string; leftNum: number; rightNum: number };

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

export function diffText(a: string, b: string): DiffRow[] {
  const left = a.split('\n');
  const right = b.split('\n');
  const dp = lcsTable(left, right);
  const rows: DiffRow[] = [];
  let i = left.length;
  let j = right.length;
  const stack: DiffRow[] = [];

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

export function countChangedLines(rows: DiffRow[]) {
  return rows.filter((r) => r.kind !== 'equal').length;
}
