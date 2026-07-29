import type { JobAnalysisResponse } from '@/lib/api';

/** 추천 쿼리에 넣을 최대 토큰(문자열 조각) 수 */
const MAX_PARTS = 40;
/** JD 요약 최대 길이 */
const JD_SUMMARY_CHARS = 500;
/** 분석 없을 때 원문 JD 최대 길이 */
const RAW_JD_CHARS = 1000;

function pushUnique(target: string[], seen: Set<string>, value: string | null | undefined) {
  const v = (value ?? '').trim();
  if (!v) return;
  const key = v.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  target.push(v);
}

function pushAll(target: string[], seen: Set<string>, values: string[] | null | undefined, limit?: number) {
  if (!values?.length) return;
  const list = limit != null ? values.slice(0, limit) : values;
  for (const v of list) {
    if (target.length >= MAX_PARTS) return;
    pushUnique(target, seen, v);
  }
}

/**
 * 공고에 민감한 RAG 추천 쿼리 키워드.
 * 문항 제목은 넣지 않는다 (공고 간 변별력 저하 방지).
 * 회사·직무·기술·책임·JD 요약을 우선한다.
 */
export function buildRecommendKeywords(
  analysis: JobAnalysisResponse | null | undefined,
  jobText: string,
): string[] {
  const parts: string[] = [];
  const seen = new Set<string>();

  if (analysis) {
    pushUnique(parts, seen, analysis.companyName);
    pushUnique(parts, seen, analysis.position);
    // 기술·필수 스킬을 앞에 두어 쿼리 벡터에 더 크게 반영
    pushAll(parts, seen, analysis.techKeywords);
    pushAll(parts, seen, analysis.requiredSkills);
    pushAll(parts, seen, analysis.solutionKeywords, 12);
    pushAll(parts, seen, analysis.preferredSkills, 10);
    pushAll(parts, seen, analysis.jobResponsibilities, 8);
    pushAll(parts, seen, analysis.talentProfile, 5);
    pushAll(parts, seen, analysis.coreCompetencies, 5);
    if (analysis.jobDescription?.trim()) {
      pushUnique(parts, seen, analysis.jobDescription.trim().slice(0, JD_SUMMARY_CHARS));
    }
  }

  if (parts.length === 0 && jobText.trim()) {
    pushUnique(parts, seen, jobText.trim().slice(0, RAW_JD_CHARS));
  }

  return parts.slice(0, MAX_PARTS);
}

export const RECOMMEND_MIN_SCORE = 0.4;
export const EXPERIENCE_REEMBED_SESSION_KEY = 'rp-exp-embed-v2';
