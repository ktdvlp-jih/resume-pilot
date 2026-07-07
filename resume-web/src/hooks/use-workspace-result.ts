import { useCallback, useEffect, useRef, useState } from 'react';

const RESULT_KEY = 'resume-pilot-workspace-result';
const DEBOUNCE_MS = 400;

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

export function loadWorkspaceResult(): WorkspaceResultState | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved';

export function useWorkspaceResult() {
  const restored = useRef(loadWorkspaceResult());
  const [state, setState] = useState<WorkspaceResultState>(restored.current ?? EMPTY);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [wasRestored] = useState(() => restored.current?.result != null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: WorkspaceResultState) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveStatus('saving');
    timer.current = setTimeout(() => {
      try {
        if (!next.result && next.recommended.length === 0) {
          localStorage.removeItem(RESULT_KEY);
        } else {
          localStorage.setItem(RESULT_KEY, JSON.stringify(next));
        }
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, DEBOUNCE_MS);
  }, []);

  const setBundle = useCallback(
    (patch: Partial<WorkspaceResultState> | ((prev: WorkspaceResultState) => WorkspaceResultState)) => {
      setState((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearResult = useCallback(() => {
    setState(EMPTY);
    localStorage.removeItem(RESULT_KEY);
    setSaveStatus('idle');
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { ...state, setBundle, clearResult, saveStatus, wasResultRestored: wasRestored };
}
