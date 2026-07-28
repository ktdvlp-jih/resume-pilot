/** 경험 라이브러리 작성·품질 기준 (워크스페이스 생성 선택 상한 5개와 별개) */
export const MAX_LIBRARY_EXPERIENCES = 30;

export const EXPERIENCE_FIELD_LIMITS = {
  title: 100,
  description: 2000,
  role: 100,
  result: 500,
  contribution: 1000,
  numericResult: 200,
  star: 800,
} as const;

export type ExperienceReadiness = 'ready' | 'thin' | 'empty';

export function experienceReadiness(exp: {
  title?: string | null;
  description?: string | null;
  role?: string | null;
  result?: string | null;
  starSituation?: string | null;
  starTask?: string | null;
  starAction?: string | null;
  starResult?: string | null;
}): ExperienceReadiness {
  const desc = (exp.description ?? '').trim();
  const result = (exp.result ?? '').trim();
  const star = [exp.starSituation, exp.starTask, exp.starAction, exp.starResult]
    .map((v) => (v ?? '').trim())
    .join('');
  if (!exp.title?.trim()) return 'empty';
  // 자소서 생성에 쓸 만큼: 설명 충분 + (성과 또는 STAR 일부)
  if (desc.length >= 80 && (result.length >= 10 || star.length >= 40) && (exp.role ?? '').trim()) {
    return 'ready';
  }
  if (desc.length >= 30 || result.length >= 5) return 'thin';
  return 'empty';
}
