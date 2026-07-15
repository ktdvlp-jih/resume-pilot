import { useCallback, useEffect, useRef, useState } from 'react';

const RESULT_KEY = 'resume-pilot-workspace-result';
const DEBOUNCE_MS = 400;
const MANUAL_KEY = '__manual__';

export type RecommendedItem = { id: string; title: string; score: number };
export type InterviewItem = { category: string; question: string };

export type WorkspaceResultState = {
  result: Record<string, unknown> | null;
  recommended: RecommendedItem[];
  interview: InterviewItem[];
  keywords: Record<string, unknown> | null;
};

const EMPTY: WorkspaceResultState = {
  result: null,
  recommended: [],
  interview: [],
  keywords: null,
};

type ResultsByPosting = Record<string, WorkspaceResultState>;

function loadAllResults(): ResultsByPosting {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ResultsByPosting;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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
          localStorage.removeItem(RESULT_KEY);
        } else {
          localStorage.setItem(RESULT_KEY, JSON.stringify(cleaned));
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
        const prevState = prev[postingKey] ?? EMPTY;
        const nextState = typeof patch === 'function' ? patch(prevState) : { ...prevState, ...patch };
        const next = { ...prev, [postingKey]: nextState };
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
    setBundle({ result: null, interview: [], keywords: null });
  }, [setBundle]);

  const state = byPosting[postingKey] ?? EMPTY;
  const wasResultRestored = initial.current[postingKey]?.result != null;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { ...state, setBundle, clearResult, clearVisibleResult, saveStatus, wasResultRestored };
}
