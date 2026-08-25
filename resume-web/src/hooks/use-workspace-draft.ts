import { useCallback, useEffect, useRef, useState } from 'react';
import {
  alignSectionExperienceIds,
  DEFAULT_EXPERIENCE_POOL_LIMIT,
  parseSectionIntents,
  qualityExperiencePoolLimit,
  type SectionIntent,
} from '@/lib/section-experiences';
import {
  readUserScopedItem,
  removeUserScopedItem,
  WORKSPACE_DRAFT_KEY,
  writeUserScopedItem,
} from '@/lib/user-storage';

const DEBOUNCE_MS = 400;

export type WorkspaceDraft = {
  selectedPostingId: string;
  jobText: string;
  rewriteLevel: number;
  sectionTitles: string[];
  /** 문항별 목표 글자 수 (sectionTitles와 동일 길이) */
  sectionTargetChars: number[];
  /** 이번 공고에 쓸 경험 풀 */
  selectedExperienceIds: string[];
  /** 공고 재료로 고를 수 있는 최대 개수 */
  experiencePoolLimit: number;
  /** 문항별 깊게 쓸 경험 (sectionTitles와 동일 길이) */
  sectionExperienceIds: string[][];
  /** AI 문항 분석. 제목이 바뀌면 다시 받는다. */
  sectionIntents: SectionIntent[];
  sectionIntentsKey: string;
};

export const DEFAULT_SECTION_TARGET_CHARS = 1200;
export const MIN_SECTION_TARGET_CHARS = 200;
export const MAX_SECTION_TARGET_CHARS = 4000;

export function clampSectionTargetChars(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SECTION_TARGET_CHARS;
  return Math.min(
    MAX_SECTION_TARGET_CHARS,
    Math.max(MIN_SECTION_TARGET_CHARS, Math.round(n)),
  );
}

/** titles 길이에 맞게 글자 수 배열을 맞춘다. */
export function alignSectionTargetChars(
  titles: string[],
  chars: number[] | undefined,
  fill = DEFAULT_SECTION_TARGET_CHARS,
): number[] {
  return titles.map((_, i) =>
    clampSectionTargetChars(typeof chars?.[i] === 'number' ? chars[i]! : fill),
  );
}

/** 예전 줄 수(≤80)는 한 줄 40자로 환산한다. */
function migrateStoredTargetChars(parsed: Record<string, unknown>): number[] | undefined {
  if (Array.isArray(parsed.sectionTargetChars)) {
    return parsed.sectionTargetChars.filter((n): n is number => typeof n === 'number');
  }
  if (Array.isArray(parsed.sectionTargetLines)) {
    return parsed.sectionTargetLines
      .filter((n): n is number => typeof n === 'number')
      .map((n) => (n <= 80 ? n * 40 : n));
  }
  return undefined;
}

const DEFAULTS: WorkspaceDraft = {
  selectedPostingId: '',
  jobText: '',
  rewriteLevel: 40,
  sectionTitles: [],
  sectionTargetChars: [],
  selectedExperienceIds: [],
  experiencePoolLimit: DEFAULT_EXPERIENCE_POOL_LIMIT,
  sectionExperienceIds: [],
  sectionIntents: [],
  sectionIntentsKey: '',
};

export function loadWorkspaceDraft(): WorkspaceDraft | null {
  try {
    const raw = readUserScopedItem(WORKSPACE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const draft = { ...DEFAULTS, ...parsed } as WorkspaceDraft;
    if (Array.isArray(draft.sectionTitles) && draft.sectionTitles.length > 5) {
      draft.sectionTitles = draft.sectionTitles.slice(0, 5);
    }
    draft.sectionTargetChars = alignSectionTargetChars(
      draft.sectionTitles,
      migrateStoredTargetChars(parsed),
    );
    const rawRows = Array.isArray(parsed.sectionExperienceIds)
      ? parsed.sectionExperienceIds.filter((row): row is string[] => Array.isArray(row))
      : [];
    draft.sectionExperienceIds = alignSectionExperienceIds(draft.sectionTitles, rawRows);
    const titlesKey = draft.sectionTitles.map((t) => t.trim()).join('\n');
    const storedKey = typeof parsed.sectionIntentsKey === 'string' ? parsed.sectionIntentsKey : '';
    if (storedKey === titlesKey && Array.isArray(parsed.sectionIntents)) {
      draft.sectionIntents = parseSectionIntents(parsed.sectionIntents, draft.sectionTitles);
      draft.sectionIntentsKey = titlesKey;
    } else {
      draft.sectionIntents = [];
      draft.sectionIntentsKey = '';
    }
    const limit = qualityExperiencePoolLimit(
      draft.sectionTitles,
      draft.sectionIntents,
      draft.sectionTargetChars,
    );
    draft.experiencePoolLimit = limit;
    const pool = Array.isArray(parsed.selectedExperienceIds)
      ? parsed.selectedExperienceIds.filter((id): id is string => typeof id === 'string')
      : [];
    draft.selectedExperienceIds = pool.slice(0, limit);
    return draft;
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
        writeUserScopedItem(WORKSPACE_DRAFT_KEY, JSON.stringify(next));
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

  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setDraftState(DEFAULTS);
    removeUserScopedItem(WORKSPACE_DRAFT_KEY);
    setSaveStatus('idle');
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { draft, setDraft, clearDraft, saveStatus, wasRestored };
}
