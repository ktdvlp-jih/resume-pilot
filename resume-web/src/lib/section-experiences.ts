/** 이번 공고에 넣을 경험 풀 상한 (문항 배정 합집합) */
export const MAX_EXPERIENCE_POOL = 8;
/** 한 문항에서 깊게 쓸 경험 상한 */
export const MAX_EXPERIENCES_PER_SECTION = 3;

export type SectionKind = 'motivation' | 'growth' | 'competency' | 'aspiration' | 'other';

export function sectionKind(title: string): SectionKind {
  const t = (title || '').replace(/\s/g, '');
  if (t.includes('지원동기')) return 'motivation';
  if (t.includes('성장')) return 'growth';
  if (t.includes('직무역량') || (t.includes('직무') && t.includes('역량'))) return 'competency';
  if (t.includes('포부')) return 'aspiration';
  return 'other';
}

export function alignSectionExperienceIds(
  titles: string[],
  rows: string[][] | undefined,
): string[][] {
  return titles.map((_, i) => uniqueCap(Array.isArray(rows?.[i]) ? rows[i]! : [], MAX_EXPERIENCES_PER_SECTION));
}

/** 풀을 문항에 나눠 넣는다. 남는 항목은 배경(일관성)용으로 비워 둔다. */
export function autoAssignSectionExperiences(titles: string[], poolIds: string[]): string[][] {
  const rows = titles.map(() => [] as string[]);
  const pool = uniqueCap(poolIds, MAX_EXPERIENCE_POOL);
  if (titles.length === 0 || pool.length === 0) return rows;

  const used = new Set<string>();
  const nextUnused = () => pool.find((id) => !used.has(id));
  const kinds = titles.map(sectionKind);

  const take = (index: number) => {
    if (rows[index].length >= MAX_EXPERIENCES_PER_SECTION) return;
    const id = nextUnused();
    if (!id) return;
    used.add(id);
    rows[index].push(id);
  };

  for (let i = 0; i < titles.length; i++) {
    if (kinds[i] === 'aspiration') continue;
    take(i);
  }
  for (let i = 0; i < titles.length; i++) {
    if (kinds[i] !== 'competency') continue;
    take(i);
  }
  for (let i = 0; i < titles.length; i++) {
    if (kinds[i] !== 'aspiration') continue;
    take(i);
  }
  return rows;
}

export function firstSectionWithRoom(
  titles: string[],
  rows: string[][],
): number {
  const kinds = titles.map(sectionKind);
  for (let i = 0; i < titles.length; i++) {
    if (kinds[i] === 'aspiration') continue;
    if ((rows[i]?.length ?? 0) < MAX_EXPERIENCES_PER_SECTION) return i;
  }
  for (let i = 0; i < titles.length; i++) {
    if ((rows[i]?.length ?? 0) < MAX_EXPERIENCES_PER_SECTION) return i;
  }
  return -1;
}

export function pruneSectionExperienceIds(rows: string[][], allowed: Set<string>): string[][] {
  return rows.map((row) => uniqueCap(row.filter((id) => allowed.has(id)), MAX_EXPERIENCES_PER_SECTION));
}

function uniqueCap(ids: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}
