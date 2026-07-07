import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'resume-pilot-workspace-draft';
const DEBOUNCE_MS = 400;

export type WorkspaceDraft = {
  selectedPostingId: string;
  jobText: string;
  rewriteLevel: number;
};

const DEFAULTS: WorkspaceDraft = {
  selectedPostingId: '',
  jobText: '',
  rewriteLevel: 40,
};

export function loadWorkspaceDraft(): WorkspaceDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceDraft>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return null;
  }
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved';

export function useWorkspaceDraft() {
  const restored = useRef(loadWorkspaceDraft());
  const [draft, setDraftState] = useState<WorkspaceDraft>(restored.current ?? DEFAULTS);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>('idle');
  const [wasRestored] = useState(() => restored.current !== null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: WorkspaceDraft) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveStatus('saving');
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, DEBOUNCE_MS);
  }, []);

  const setDraft = useCallback(
    (patch: Partial<WorkspaceDraft> | ((prev: WorkspaceDraft) => WorkspaceDraft)) => {
      setDraftState((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { draft, setDraft, saveStatus, wasRestored };
}
