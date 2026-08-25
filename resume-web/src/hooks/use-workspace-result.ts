import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readUserScopedItem,
  removeUserScopedItem,
  WORKSPACE_RESULT_KEY,
  writeUserScopedItem,
} from '@/lib/user-storage';

const DEBOUNCE_MS = 400;
const MANUAL_KEY = '__manual__';

export type RecommendedItem = { id: string; title: string; score: number; type?: string; description?: string };
export type InterviewItem = { category: string; question: string };
export type SectionAiStatus = 'idle' | 'loading' | 'ok' | 'error' | 'skipped';
export type PanelAiStatus = 'idle' | 'loading' | 'ok' | 'error';

export type SectionResultMeta = {
  index: number;
  title: string;
  content: string;
  status: SectionAiStatus;
  error?: string | null;
};

export type WorkspaceResultState = {
  result: Record<string, unknown> | null;
  /** 생성 시점의 문항 제목 — 결과 복원 시에도 문단 헤더 표시용 */
  sectionTitles: string[];
  /** 문항별 AI 작성 상태 (화면 표시·부분 재생성용) */
  sectionStatuses: SectionResultMeta[];
  recommended: RecommendedItem[];
  interview: InterviewItem[];
  keywords: Record<string, unknown> | null;
  interviewStatus: PanelAiStatus;
  keywordsStatus: PanelAiStatus;
  diagnosisStatus: PanelAiStatus;
};

type ResultsByPosting = Record<string, WorkspaceResultState>;

function loadAllResults(): ResultsByPosting {
  try {
    const raw = readUserScopedItem(WORKSPACE_RESULT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ResultsByPosting;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, normalizeState(v)]),
    );
  } catch {
    return {};
  }
}

function hasSavedLetter(state: WorkspaceResultState | undefined): boolean {
  const content = state?.result?.content;
  return typeof content === 'string' && content.trim().length > 0;
}

/** 워크스페이스에 자기소개서 본문이 저장된 공고 ID (직접 입력 `__manual__` 제외) */
export function postingIdsWithSavedLetter(): Set<string> {
  const ids = new Set<string>();
  for (const [key, state] of Object.entries(loadAllResults())) {
    if (key === MANUAL_KEY) continue;
    if (hasSavedLetter(state)) ids.add(key);
  }
  return ids;
}

function normalizeState(raw: Partial<WorkspaceResultState> | null | undefined): WorkspaceResultState {
  const result = raw?.result ?? null;
  const detections = (result?.detections as unknown[]) || [];
  const interview = Array.isArray(raw?.interview) ? raw.interview : [];
  const keywords = raw?.keywords ?? null;
  return {
    result,
    sectionTitles: Array.isArray(raw?.sectionTitles) ? raw.sectionTitles : [],
    sectionStatuses: Array.isArray(raw?.sectionStatuses) ? raw.sectionStatuses : [],
    recommended: Array.isArray(raw?.recommended) ? raw.recommended : [],
    interview,
    keywords,
    interviewStatus: raw?.interviewStatus ?? (interview.length > 0 ? 'ok' : 'idle'),
    keywordsStatus: raw?.keywordsStatus ?? (keywords ? 'ok' : 'idle'),
    diagnosisStatus: raw?.diagnosisStatus ?? (detections.length > 0 ? 'ok' : 'idle'),
  };
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved';

/**
 * 결과(자기소개서·문장 정밀진단·경험 추천 등)는 선택된 기업공고(postingId)별로 분리 저장한다.
 * 공고를 바꾸면 해당 공고에 저장된 결과가 표시되고, 새 공고를 고르면 빈 화면이 뜬다.
 */
export function useWorkspaceResult(postingId: string) {
  const postingKey = postingId || MANUAL_KEY;
  const initial = useRef(loadAllResults());
  const [byPosting, setByPosting] = useState<ResultsByPosting>(initial.current);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: ResultsByPosting) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveStatus('saving');
    timer.current = setTimeout(() => {
      try {
        const cleaned = Object.fromEntries(
          Object.entries(next).filter(([, v]) => v.result || v.recommended.length > 0),
        );
        if (Object.keys(cleaned).length === 0) {
          removeUserScopedItem(WORKSPACE_RESULT_KEY);
        } else {
          writeUserScopedItem(WORKSPACE_RESULT_KEY, JSON.stringify(cleaned));
        }
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, DEBOUNCE_MS);
  }, []);

  const setBundle = useCallback(
    (patch: Partial<WorkspaceResultState> | ((prev: WorkspaceResultState) => WorkspaceResultState)) => {
      setByPosting((prev) => {
        const prevState = normalizeState(prev[postingKey]);
        const nextState = typeof patch === 'function' ? patch(prevState) : { ...prevState, ...patch };
        const next = { ...prev, [postingKey]: normalizeState(nextState) };
        persist(next);
        return next;
      });
    },
    [persist, postingKey],
  );

  // 현재 공고의 결과를 완전히 삭제한다 (초기화 버튼 전용).
  const clearResult = useCallback(() => {
    setByPosting((prev) => {
      if (!(postingKey in prev)) return prev;
      const next = { ...prev };
      delete next[postingKey];
      persist(next);
      return next;
    });
  }, [persist, postingKey]);

  // 문항 제목·경험 선택 등 생성 조건이 바뀌어 기존 결과가 더 이상 유효하지 않을 때
  // 화면에서만 지운다 (다른 공고의 저장 데이터는 건드리지 않음).
  const clearVisibleResult = useCallback(() => {
    setBundle({
      result: null,
      sectionTitles: [],
      sectionStatuses: [],
      interview: [],
      keywords: null,
      interviewStatus: 'idle',
      keywordsStatus: 'idle',
      diagnosisStatus: 'idle',
    });
  }, [setBundle]);

  const state = normalizeState(byPosting[postingKey]);
  const wasResultRestored = initial.current[postingKey]?.result != null;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { ...state, setBundle, clearResult, clearVisibleResult, saveStatus, wasResultRestored };
}
