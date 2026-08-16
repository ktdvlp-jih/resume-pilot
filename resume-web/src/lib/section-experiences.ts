/** 이번 공고에 넣을 경험 풀 절대 상한 (API) */
export const MAX_EXPERIENCE_POOL = 12;
/** 품질 기준 선택 개수 하한 */
export const MIN_EXPERIENCE_POOL_LIMIT = 1;
/** 문항 없을 때 기본값: 문항당 1개 기준의 대표 구성(4문항) */
export const DEFAULT_EXPERIENCE_POOL_LIMIT = 4;
/** 한 문항에서 깊게 쓸 경험 상한 */
export const MAX_EXPERIENCES_PER_SECTION = 3;
/** 공고 재료 상한: 긴 문항이 있으면 문항 수보다 많아질 수 있다 */
export const MAX_EXPERIENCE_POOL_LIMIT = 8;

export function clampExperiencePoolLimit(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_EXPERIENCE_POOL_LIMIT;
  return Math.min(MAX_EXPERIENCE_POOL_LIMIT, Math.max(MIN_EXPERIENCE_POOL_LIMIT, Math.round(n)));
}

/** 목표 글자 수에 필요한 깊게 쓸 경험 수. 짧은 문항 1, 긴 문항 최대 3. */
export function experiencesForTargetChars(chars: number): number {
  const n = Number.isFinite(chars) ? chars : 1200;
  if (n <= 1200) return 1;
  if (n <= 2000) return 2;
  return 3;
}

export function sectionExperienceNeeds(
  titles: string[],
  intents?: SectionIntent[],
  targetChars?: number[],
): number[] {
  const aligned = alignSectionIntents(titles, intents);
  return titles.map((title, i) => {
    const intent = aligned[i];
    const unique = intent ? intent.needsUniqueStory : sectionKind(title) !== 'aspiration';
    if (!unique) return 0;
    const chars = typeof targetChars?.[i] === 'number' ? targetChars[i]! : 1200;
    return Math.min(MAX_EXPERIENCES_PER_SECTION, experiencesForTargetChars(chars));
  });
}

/** 칩 선택 상한. 포부형(need 0)도 남는 재료 1개는 넣을 수 있다. */
export function sectionExperienceCap(need: number): number {
  return Math.min(MAX_EXPERIENCES_PER_SECTION, Math.max(1, need));
}

export type SectionExperienceShortfall = {
  index: number;
  title: string;
  need: number;
  count: number;
  target: number;
};

/** 목표 글자 수 대비 배정된 경험이 부족한 문항 */
export function sectionExperienceShortfalls(
  titles: string[],
  rows: string[][],
  intents?: SectionIntent[],
  targetChars?: number[],
): SectionExperienceShortfall[] {
  const needs = sectionExperienceNeeds(titles, intents, targetChars);
  return titles.flatMap((title, i) => {
    const need = needs[i] ?? 0;
    if (need <= 0) return [];
    const count = rows[i]?.length ?? 0;
    if (count >= need) return [];
    const target = typeof targetChars?.[i] === 'number' ? targetChars[i]! : 1200;
    return [{ index: i, title, need, count, target }];
  });
}

/** 깊게 쓸 장면 수 = 문항별 목표 글자 수의 합. 포부형은 0. */
export function qualityExperiencePoolLimit(
  titles: string[],
  intents?: SectionIntent[],
  targetChars?: number[],
): number {
  if (!titles.length) return DEFAULT_EXPERIENCE_POOL_LIMIT;
  const total = sectionExperienceNeeds(titles, intents, targetChars).reduce((a, b) => a + b, 0);
  return clampExperiencePoolLimit(total || DEFAULT_EXPERIENCE_POOL_LIMIT);
}

export type SectionKind = 'motivation' | 'growth' | 'competency' | 'aspiration' | 'other';

export type SectionIntent = {
  title: string;
  intent: string;
  needsUniqueStory: boolean;
  maxExperiences: number;
  lookFor: string[];
  asks?: string;
};

export function alignSectionIntents(
  titles: string[],
  intents: SectionIntent[] | undefined,
): Array<SectionIntent | null> {
  return titles.map((title, i) => {
    const row = intents?.[i];
    if (!row) return null;
    if (row.title && row.title !== title && compact(row.title) !== compact(title)) return null;
    return row;
  });
}

export function parseSectionIntents(raw: unknown, titles: string[]): SectionIntent[] {
  const list = Array.isArray(raw) ? raw : [];
  return titles.map((title, i) => {
    const item = list[i] && typeof list[i] === 'object' ? (list[i] as Record<string, unknown>) : {};
    const lookRaw = item.look_for ?? item.lookFor;
    const lookFor = Array.isArray(lookRaw)
      ? lookRaw.map((v) => String(v || '').toUpperCase()).filter(Boolean)
      : [];
    const maxRaw = item.max_experiences ?? item.maxExperiences;
    let maxExperiences = typeof maxRaw === 'number' ? maxRaw : 1;
    if (!Number.isFinite(maxExperiences) || maxExperiences < 1) maxExperiences = 1;
    if (maxExperiences > 2) maxExperiences = 2;
    const needsRaw = item.needs_unique_story ?? item.needsUniqueStory;
    const intent = String(item.intent || 'other').toLowerCase();
    const needsUniqueStory = typeof needsRaw === 'boolean' ? needsRaw : intent !== 'aspiration';
    return {
      title,
      intent,
      needsUniqueStory: intent === 'aspiration' ? false : needsUniqueStory,
      maxExperiences: intent === 'aspiration' ? 1 : maxExperiences,
      lookFor,
      asks: typeof item.asks === 'string' ? item.asks : '',
    };
  });
}

function compact(s: string | undefined): string {
  return (s || '').toLowerCase().replace(/\s/g, '');
}

export function sectionKind(title: string): SectionKind {
  const t = compact(title);
  if (hasAny(t, ['입사후포부', '포부', '커리어계획'])) return 'aspiration';
  if (hasAny(t, ['지원동기', '지원이유', '왜지원', '지원하게된'])) return 'motivation';
  if (hasAny(t, ['성장과정', '성장', '실패', '좌절', '극복', '배움'])) return 'growth';
  if (
    hasAny(t, ['직무역량', '전문성', '기술스택', '직무경험', '프로젝트경험', '보유기술', '경험직무', '경력기술'])
    || (t.includes('직무') && t.includes('역량'))
  ) {
    return 'competency';
  }
  return 'other';
}

export function alignSectionExperienceIds(
  titles: string[],
  rows: string[][] | undefined,
): string[][] {
  return titles.map((_, i) => uniqueCap(Array.isArray(rows?.[i]) ? rows[i]! : [], MAX_EXPERIENCES_PER_SECTION));
}

export type ExperienceAssignMeta = {
  id: string;
  type?: string;
  title?: string;
  score?: number;
  description?: string;
  skills?: string[];
};

function hasAny(haystack: string, keys: string[]): boolean {
  return keys.some((k) => haystack.includes(k));
}

function experienceType(meta?: ExperienceAssignMeta): string {
  return (meta?.type || 'OTHER').toUpperCase();
}

function ragScore(meta?: ExperienceAssignMeta): number {
  return typeof meta?.score === 'number' && Number.isFinite(meta.score) ? meta.score : 0;
}

function experienceHaystack(meta?: ExperienceAssignMeta): string {
  const skills = (meta?.skills ?? []).join(' ');
  return compact([meta?.title, meta?.description, skills, meta?.type].filter(Boolean).join(' '));
}

const STOP_TOKENS = new Set([
  '그리고', '또는', '관련', '대해', '있는', '경험', '서술', '하시오', '하세요', '본인', '지원자',
  '문항', '자기소개', '소개', '작성', '이유', '무엇', '어떻게', '어떤', '가장', '했던', '것',
  '등', '및', '대한', '있는', '없는', '당신', '우리', '회사', 'the', 'and', 'for', 'with',
]);

/** 문항에서 가려낸 말. 경험 본문과 겹치면 그 문항에 넣는다. */
function questionTokens(title: string): string[] {
  const t = (title || '').toLowerCase();
  const parts = t.split(/[\s,/·|:;+\-–—()[\]「」『』"'“”]+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const v = raw.trim();
    if (v.length < 2 || STOP_TOKENS.has(v) || seen.has(v)) return;
    seen.add(v);
    out.push(v);
  };
  for (const p of parts) {
    for (const m of p.match(/[가-힣]{2,}/g) ?? []) add(m);
    for (const m of p.match(/[a-z][a-z0-9+#.]{1,}/g) ?? []) add(m);
  }
  return out;
}

type QuestionCue = { needles: string[]; types: string[]; weight: number };

const QUESTION_CUES: QuestionCue[] = [
  { needles: ['지원동기', '지원이유', '왜지원', '지원하게된', 'why'], types: ['ACHIEVEMENT', 'PROJECT'], weight: 5 },
  { needles: ['성장과정', '성장', '실패', '좌절', '극복', '배움'], types: ['PROBLEM_SOLVING', 'CONFLICT_RESOLUTION', 'OTHER'], weight: 8 },
  { needles: ['직무역량', '직무', '역량', '전문성', '기술스택', '프로젝트', '개발'], types: ['PROJECT', 'TECHNOLOGY', 'ACHIEVEMENT'], weight: 8 },
  { needles: ['포부', '입사후', '커리어계획'], types: [], weight: -10 },
  { needles: ['협업', '팀워크', '소통', '커뮤니케이션'], types: ['COLLABORATION'], weight: 10 },
  { needles: ['갈등', '의견충돌', '조율'], types: ['CONFLICT_RESOLUTION'], weight: 10 },
  { needles: ['리더십', '리더', '이끌', '멘토'], types: ['LEADERSHIP'], weight: 10 },
  { needles: ['문제해결', '문제', '장애', '트러블', '개선'], types: ['PROBLEM_SOLVING'], weight: 10 },
  { needles: ['성과', '기여', '임팩트', '결과'], types: ['ACHIEVEMENT'], weight: 7 },
];

function tokenHits(question: string, expText: string): number {
  let n = 0;
  for (const tok of questionTokens(question)) {
    if (!expText.includes(tok)) continue;
    n += tok.length >= 3 ? 2 : 1;
  }
  return n;
}

/** 이 문항 제목에 이 경험이 얼마나 맞는지. AI 분석이 있으면 그걸 우선한다. */
export function questionExperienceScore(
  question: string,
  meta?: ExperienceAssignMeta,
  intent?: SectionIntent | null,
): number {
  const type = experienceType(meta);
  const expText = experienceHaystack(meta);
  let n = 0;

  if (intent) {
    const look = intent.lookFor.map((t) => t.toUpperCase());
    if (look.includes(type)) n += 10;
    else if (look.length) n += 1;
    n += tokenHits(intent.asks || question, expText) * 2;
    n += tokenHits(question, expText) * 2;
    const jdW = intent.intent === 'competency' ? 4
      : intent.intent === 'motivation' ? 3
        : intent.needsUniqueStory ? 2 : 0.4;
    n += ragScore(meta) * jdW;
    if (!intent.needsUniqueStory) n -= 8;
    return n;
  }

  const kind = sectionKind(question);
  const q = compact(question);
  for (const cue of QUESTION_CUES) {
    if (!hasAny(q, cue.needles)) continue;
    if (cue.types.length === 0) n += cue.weight;
    else n += cue.types.includes(type) ? cue.weight : 1;
  }
  n += tokenHits(question, expText) * 2;
  const jdW = kind === 'competency' ? 4 : kind === 'motivation' ? 3 : kind === 'aspiration' ? 0.4 : 2;
  n += ragScore(meta) * jdW;
  if (kind === 'aspiration') n -= 8;
  return n;
}

function metaById(metas: ExperienceAssignMeta[] | undefined): Map<string, ExperienceAssignMeta> {
  const map = new Map<string, ExperienceAssignMeta>();
  if (!metas) return map;
  for (const m of metas) {
    if (!m?.id || map.has(m.id)) continue;
    map.set(m.id, m);
  }
  return map;
}

/**
 * 문항 분석을 보고, 그 질문에 가장 맞는 경험을 넣는다.
 * 분석이 없으면 제목 키워드로 맞춘다. 같은 입력이면 같은 결과.
 */
export function autoAssignSectionExperiences(
  titles: string[],
  poolIds: string[],
  metas?: ExperienceAssignMeta[],
  intents?: SectionIntent[],
  targetChars?: number[],
): string[][] {
  const rows = titles.map(() => [] as string[]);
  const pool = uniqueCap(poolIds, MAX_EXPERIENCE_POOL);
  if (titles.length === 0 || pool.length === 0) return rows;

  const aligned = alignSectionIntents(titles, intents);
  const needs = sectionExperienceNeeds(titles, intents, targetChars);
  const lookup = metaById(metas);
  const unused = [...pool];

  const assignBest = (allow: (index: number) => boolean, capOf: (index: number) => number): boolean => {
    let bestSection = -1;
    let bestAt = -1;
    let bestAff = -Infinity;
    let bestRag = -Infinity;
    for (let i = 0; i < titles.length; i++) {
      if (!allow(i)) continue;
      if (rows[i].length >= Math.min(capOf(i), MAX_EXPERIENCES_PER_SECTION)) continue;
      for (let j = 0; j < unused.length; j++) {
        const meta = lookup.get(unused[j]!) ?? { id: unused[j]! };
        const aff = questionExperienceScore(titles[i]!, meta, aligned[i]);
        const rag = ragScore(meta);
        if (aff > bestAff || (aff === bestAff && rag > bestRag)) {
          bestAff = aff;
          bestRag = rag;
          bestSection = i;
          bestAt = j;
        }
      }
    }
    if (bestSection < 0 || bestAt < 0) return false;
    const [chosen] = unused.splice(bestAt, 1);
    if (chosen) rows[bestSection]!.push(chosen);
    return true;
  };

  while (assignBest((i) => needs[i]! > 0, () => 1)) {
    /* 고유 장면이 필요한 문항마다 먼저 1개 */
  }
  while (assignBest((i) => needs[i]! >= 2, (i) => needs[i]!)) {
    /* 긴 문항은 목표 글자 수만큼 더 채운다 */
  }
  while (assignBest((i) => needs[i] === 0, () => 1)) {
    /* 포부형은 남는 재료만 */
  }
  return rows;
}

export function firstSectionWithRoom(
  titles: string[],
  rows: string[][],
  intents?: SectionIntent[],
  targetChars?: number[],
): number {
  const needs = sectionExperienceNeeds(titles, intents, targetChars);
  for (let i = 0; i < titles.length; i++) {
    const cap = sectionExperienceCap(needs[i] ?? 0);
    if ((rows[i]?.length ?? 0) < cap) return i;
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
