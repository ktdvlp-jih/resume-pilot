import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  ClipboardCheck,
  HelpCircle,
  History,
  Info,
  Loader2,
  ListPlus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
  X,
  Columns2,
} from 'lucide-react';
import { api, type JobPostingResponse } from '@/lib/api';
import { asArray } from '@/lib/query-utils';
import { ResumeExportMenu } from '@/components/resume/resume-export-menu';
import { InlineEditChat } from '@/components/workspace/inline-edit-chat';
import {
  buildRecommendKeywords,
  EXPERIENCE_REEMBED_SESSION_KEY,
  RECOMMEND_FETCH_LIMIT,
  RECOMMEND_MIN_SCORE,
  RECOMMEND_PAGE_SIZE,
} from '@/lib/recommend-keywords';
import { experienceReadiness } from '@/lib/experience-limits';
import {
  alignSectionTargetChars,
  clampSectionTargetChars,
  DEFAULT_SECTION_TARGET_CHARS,
  useWorkspaceDraft,
} from '@/hooks/use-workspace-draft';
import { SectionExperiencePicker } from '@/components/workspace/section-experience-picker';
import {
  alignSectionExperienceIds,
  autoAssignSectionExperiences,
  experiencesForTargetChars,
  fillExperiencePool,
  parseSectionIntents,
  qualityExperiencePoolLimit,
  sectionExperienceCap,
  sectionExperienceNeeds,
  sectionExperienceShortfalls,
  type ExperienceAssignMeta,
} from '@/lib/section-experiences';
import {
  postingIdsWithSavedLetter,
  useWorkspaceResult,
  type PanelAiStatus,
  type SectionAiStatus,
  type SectionResultMeta,
} from '@/hooks/use-workspace-result';
import { useTypewriter } from '@/hooks/use-typewriter';
import { HighlightedContent } from '@/components/HighlightedContent';
import { HumanizeReport, type HumanizeAnalysis, type HumanizeReplacement } from '@/components/workspace/humanize-report';
import { ProseDiffView } from '@/components/common/prose-diff-view';
import { LoadingSpinner } from '@/components/common/loading-state';
import { AutosaveIndicator } from '@/components/common/autosave-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { PaginationControls } from '@/components/common/pagination-controls';
import { WorkspaceLayout, WorkspacePanelTitle } from '@/components/workspace/workspace-layout';
import { StatusChip } from '@/components/common/status-chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn, joinList } from '@/lib/utils';
import type { DraftSaveStatus } from '@/hooks/use-workspace-draft';

const LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'destructive',
};

const LEVEL_LABEL_KEY: Record<string, string> = {
  GREEN: 'workspace.levelNatural',
  YELLOW: 'workspace.levelRevise',
  RED: 'workspace.levelRewrite',
};

const SECTION_TITLE_PRESETS = ['지원동기', '성장과정', '직무역량', '입사 후 포부'];
/** 문항 제목 공통 상한 */
const MAX_SECTIONS = 5;

function splitParagraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function detectScorePatch(
  detectRes: Record<string, unknown>,
  prevScores?: Record<string, unknown>,
): Record<string, unknown> {
  const ai = Number(detectRes.ai_trace_percent ?? 0);
  const natural = Number(detectRes.naturalness ?? Math.max(0, 100 - ai));
  return {
    ...prevScores,
    ai_trace_percent: detectRes.ai_trace_percent,
    naturalness: natural,
  };
}

/** 문항 수에 맞게 문단을 맞춘다. 문단이 더 많으면 뒤에 합치고, 적으면 있는 만큼만 쓴다. */
function alignParagraphsToTitles(paragraphs: string[], titles: string[]): string[] {
  if (titles.length === 0) return paragraphs;
  if (paragraphs.length === titles.length) return paragraphs;
  if (paragraphs.length > titles.length) {
    const head = paragraphs.slice(0, titles.length - 1);
    const tail = paragraphs.slice(titles.length - 1).join(' ');
    return [...head, tail];
  }
  return paragraphs;
}

function sectionsFromResponse(
  res: Record<string, unknown>,
  titles: string[],
): SectionResultMeta[] {
  const raw = res.sections;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((s, i) => {
      const row = (s ?? {}) as Record<string, unknown>;
      const status = String(row.status ?? 'ok') as SectionAiStatus;
      return {
        index: typeof row.index === 'number' ? row.index : i,
        title: String(row.title ?? titles[i] ?? ''),
        content: String(row.content ?? ''),
        status: ['idle', 'loading', 'ok', 'error', 'skipped'].includes(status) ? status : 'ok',
        error: row.error != null ? String(row.error) : null,
      };
    });
  }
  const paras = splitParagraphs(String(res.content ?? ''));
  if (titles.length === 0) {
    return paras.map((content, i) => ({
      index: i,
      title: '',
      content,
      status: content.trim() ? 'ok' : 'error',
      error: content.trim() ? null : 'empty',
    }));
  }
  const aligned = alignParagraphsToTitles(paras, titles);
  return titles.map((title, i) => {
    const content = aligned[i] ?? '';
    return {
      index: i,
      title,
      content,
      status: content.trim() ? 'ok' : 'error',
      error: content.trim() ? null : 'empty',
    };
  });
}

function panelChipVariant(status: PanelAiStatus | SectionAiStatus): 'default' | 'success' | 'warning' | 'destructive' | 'primary' {
  if (status === 'ok') return 'success';
  if (status === 'error') return 'destructive';
  if (status === 'loading') return 'primary';
  if (status === 'skipped') return 'warning';
  return 'default';
}

const SCORE_KEY_MAP: Record<string, string> = {
  naturalness: 'workspace.scoreNaturalness',
  company_fit: 'workspace.scoreCompanyFit',
  style_retention: 'workspace.scoreStyleRetention',
  ai_trace_percent: 'workspace.scoreAiTracePercent',
  star_application: 'workspace.scoreStarApplication',
  experience_utilization: 'workspace.scoreExperienceUtilization',
};

const SCORE_DESC_KEY_MAP: Record<string, string> = {
  naturalness: 'workspace.scoreNaturalnessDesc',
  company_fit: 'workspace.scoreCompanyFitDesc',
  style_retention: 'workspace.scoreStyleRetentionDesc',
  ai_trace_percent: 'workspace.scoreAiTracePercentDesc',
  star_application: 'workspace.scoreStarApplicationDesc',
  experience_utilization: 'workspace.scoreExperienceUtilizationDesc',
};

const REVIEW_SCORE_KEYS = new Set([
  'company_fit',
  'style_retention',
  'star_application',
  'experience_utilization',
]);

function reviewScoreScale(scores: Record<string, unknown>): number {
  const nums = [...REVIEW_SCORE_KEYS]
    .map((key) => Number(scores[key]))
    .filter((n) => Number.isFinite(n));
  const maxV = nums.length ? Math.max(...nums) : 0;
  if (maxV > 0 && maxV <= 5) return 20;
  if (maxV > 0 && maxV <= 10) return 10;
  return 1;
}

function formatQualityScore(key: string, raw: unknown, scale: number): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  if (REVIEW_SCORE_KEYS.has(key)) {
    return String(Math.max(0, Math.min(100, Math.round(n * scale))));
  }
  const clamped = Math.max(0, Math.min(100, n));
  return Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1);
}

function formatHistoryDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function versionLabel(
  v: { name?: string; metadata?: Record<string, unknown> },
  date: string,
): string {
  const fromField = v.name?.trim();
  if (fromField) return fromField;
  const meta = v.metadata?.name;
  if (typeof meta === 'string' && meta.trim()) return meta.trim();
  return date;
}

function WrittenCharCount({
  count,
  target,
  className,
}: {
  count: number;
  target?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const hasTarget = typeof target === 'number' && target > 0;
  const over = hasTarget && count > target;
  return (
    <span
      className={cn(
        'tabular-nums text-xs',
        over ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
        className,
      )}
    >
      {hasTarget
        ? t('workspace.sectionWrittenCharsWithTarget', {
            count: count.toLocaleString(),
            target: (target ?? 0).toLocaleString(),
          })
        : t('workspace.sectionWrittenChars', { count: count.toLocaleString() })}
    </span>
  );
}

function mergeSaveStatus(a: DraftSaveStatus, b: DraftSaveStatus): DraftSaveStatus {
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

function SectionTargetCharsField({
  value,
  ragCount,
  onCommit,
}: {
  value: number;
  ragCount?: number;
  onCommit: (n: number) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    focusedRef.current = false;
    const digits = draft.replace(/\D/g, '');
    if (!digits) {
      setDraft(String(value));
      return;
    }
    const next = clampSectionTargetChars(Number(digits));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
      <span className="shrink-0">{t('workspace.sectionTargetCharsLabel')}</span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="h-7 w-16 tabular-nums"
        aria-label={t('workspace.sectionTargetCharsLabel')}
      />
      <span>{t('workspace.sectionTargetCharsUnit')}</span>
      <span className="text-[11px] text-foreground/80">
        {t('workspace.sectionRagByChars', {
          count: ragCount ?? experiencesForTargetChars(value),
        })}
      </span>
    </div>
  );
}

export default function WorkspacePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { draft, setDraft, clearDraft, saveStatus: draftSaveStatus, wasRestored } = useWorkspaceDraft();
  const { selectedPostingId, jobText, rewriteLevel, sectionTitles, sectionTargetChars, selectedExperienceIds, experiencePoolLimit, sectionExperienceIds, sectionIntents, sectionIntentsKey } = draft;

  useEffect(() => {
    const postingId = searchParams.get('postingId');
    if (!postingId) return;
    setDraft({ selectedPostingId: postingId });
    const next = new URLSearchParams(searchParams);
    next.delete('postingId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setDraft, setSearchParams]);

  useEffect(() => {
    const raw = searchParams.get('experienceIds');
    if (!raw) return;
    const ids = raw.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setDraft({ selectedExperienceIds: ids });
    const next = new URLSearchParams(searchParams);
    next.delete('experienceIds');
    setSearchParams(next, { replace: true });
  }, [searchParams, setDraft, setSearchParams]);
  const {
    result,
    sectionTitles: savedSectionTitles,
    sectionStatuses,
    recommended,
    interview,
    keywords,
    interviewStatus,
    keywordsStatus,
    diagnosisStatus,
    setBundle,
    clearResult,
    clearVisibleResult,
    saveStatus: resultSaveStatus,
    wasResultRestored,
  } = useWorkspaceResult(selectedPostingId);
  const [loading, setLoading] = useState(false);
  const [sectionLoadingIndex, setSectionLoadingIndex] = useState<number | null>(null);
  const [regenPromptOpenIndex, setRegenPromptOpenIndex] = useState<number | null>(null);
  const [regenInstructions, setRegenInstructions] = useState<Record<number, string>>({});
  const [panelLoading, setPanelLoading] = useState<
    Partial<Record<'interview' | 'keywords' | 'diagnosis' | 'humanize', boolean>>
  >({});
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendError, setRecommendError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [justGenerated, setJustGenerated] = useState(false);
  const [thinConfirmOpen, setThinConfirmOpen] = useState(false);
  const [recommendPage, setRecommendPage] = useState(1);
  const [loadedVersionId, setLoadedVersionId] = useState('');
  const [rightTab, setRightTab] = useState('result');
  const [resultView, setResultView] = useState<'letter' | 'diff'>('letter');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | 'all' | null>(null);
  const [editDraft, setEditDraft] = useState('');
  /** 공고별로 복원 토스트를 한 번만 띄움 (생성 완료 후 justGenerated 해제 시 재노출 방지) */
  const resultRestoredToastKey = useRef<string | null>(null);
  const draftRestoredToastShown = useRef(false);

  // 저장된 결과는 진입·공고 전환 시 toast로만 잠깐 안내. 패널에 상시 문구를 두지 않음.
  useEffect(() => {
    if (justGenerated || loading) return;
    if (!wasResultRestored || !result?.content) return;
    const key = selectedPostingId || '__none__';
    if (resultRestoredToastKey.current === key) return;
    resultRestoredToastKey.current = key;
    toast.message(t('workspace.resultRestored'), { duration: 3500 });
  }, [wasResultRestored, selectedPostingId, justGenerated, loading, result?.content, t]);

  useEffect(() => {
    if (!wasRestored || !jobText) return;
    if (draftRestoredToastShown.current) return;
    draftRestoredToastShown.current = true;
    toast.message(t('workspace.draftRestored'), { duration: 3500 });
  }, [wasRestored, jobText, t]);

  useEffect(() => {
    setLoadedVersionId('');
    setEditingSectionIndex(null);
    setEditDraft('');
  }, [selectedPostingId]);

  const selectedExperienceSet = useMemo(() => new Set(selectedExperienceIds), [selectedExperienceIds]);
  const alignedSectionExperienceIds = useMemo(
    () => alignSectionExperienceIds(sectionTitles, sectionExperienceIds),
    [sectionTitles, sectionExperienceIds],
  );

  const alignedTargetChars = useMemo(
    () => alignSectionTargetChars(sectionTitles, sectionTargetChars),
    [sectionTitles, sectionTargetChars],
  );
  const sectionNeeds = useMemo(
    () => sectionExperienceNeeds(sectionTitles, sectionIntents, alignedTargetChars),
    [sectionTitles, sectionIntents, alignedTargetChars],
  );
  const poolLimit = qualityExperiencePoolLimit(sectionTitles, sectionIntents, alignedTargetChars);
  const assignmentShortfalls = useMemo(
    () => sectionExperienceShortfalls(
      sectionTitles,
      alignedSectionExperienceIds,
      sectionIntents,
      alignedTargetChars,
    ),
    [sectionTitles, alignedSectionExperienceIds, sectionIntents, alignedTargetChars],
  );

  const { data: experiences = [] } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });
  const experienceById = useMemo(() => {
    const map = new Map(experiences.map((e) => [e.id, e]));
    return map;
  }, [experiences]);

  const assignSources = useMemo((): ExperienceAssignMeta[] => {
    const map = new Map<string, ExperienceAssignMeta>();
    for (const e of experiences) {
      map.set(e.id, {
        id: e.id,
        type: e.type,
        title: e.title,
        description: e.description,
        skills: e.skills,
      });
    }
    for (const r of recommended) {
      const prev = map.get(r.id);
      map.set(r.id, {
        id: r.id,
        type: r.type || prev?.type,
        title: r.title || prev?.title,
        score: r.score,
        description: r.description || prev?.description,
        skills: prev?.skills,
      });
    }
    return [...map.values()];
  }, [experiences, recommended]);

  const charsForTitles = (titles: string[], chars?: number[]) =>
    alignSectionTargetChars(titles, chars ?? (titles.length === sectionTitles.length ? alignedTargetChars : undefined));

  const assignToSections = (
    titles: string[],
    ids: string[],
    extra?: ExperienceAssignMeta[],
    intents = sectionIntents,
    chars?: number[],
  ) => autoAssignSectionExperiences(
    titles,
    ids,
    extra ?? assignSources,
    intents,
    charsForTitles(titles, chars),
  );

  const analyzeSeq = useRef(0);
  const titlesKey = sectionTitles.map((t) => t.trim()).join('\n');

  useEffect(() => {
    if (!titlesKey) {
      setDraft((prev) => {
        if (!prev.sectionIntents.length && !prev.sectionIntentsKey) return prev;
        return { ...prev, sectionIntents: [], sectionIntentsKey: '' };
      });
      return;
    }
    if (sectionIntentsKey === titlesKey && sectionIntents.length === sectionTitles.length) return;
    const seq = ++analyzeSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.analyzeSections(sectionTitles);
        if (seq !== analyzeSeq.current) return;
        if (!Array.isArray(data.sections) || data.sections.length === 0) return;
        const intents = parseSectionIntents(data.sections, sectionTitles);
        setDraft((prev) => {
          const key = prev.sectionTitles.map((t) => t.trim()).join('\n');
          if (key !== titlesKey) return prev;
          const chars = alignSectionTargetChars(prev.sectionTitles, prev.sectionTargetChars);
          const nextLimit = qualityExperiencePoolLimit(prev.sectionTitles, intents, chars);
          const nextPool = prev.selectedExperienceIds.slice(0, nextLimit);
          return {
            ...prev,
            sectionIntents: intents,
            sectionIntentsKey: titlesKey,
            experiencePoolLimit: nextLimit,
            selectedExperienceIds: nextPool,
            sectionExperienceIds: autoAssignSectionExperiences(
              prev.sectionTitles,
              nextPool,
              assignSources,
              intents,
              chars,
            ),
          };
        });
      } catch {
        // 분석 실패 시 제목 키워드 배정 유지
      }
    }, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 문항 제목이 바뀔 때만 분석
  }, [titlesKey]);

  const toggleExperience = (id: string) => {
    const nextPool = selectedExperienceIds.includes(id)
      ? selectedExperienceIds.filter((x) => x !== id)
      : selectedExperienceIds.length >= poolLimit
        ? selectedExperienceIds
        : [...selectedExperienceIds, id];
    if (nextPool === selectedExperienceIds) return;

    setDraft({
      selectedExperienceIds: nextPool,
      sectionExperienceIds: assignToSections(sectionTitles, nextPool),
    });
    if (result?.content) clearVisibleResult();
  };

  useEffect(() => {
    const trimmed = selectedExperienceIds.slice(0, poolLimit);
    const nextPool =
      trimmed.length < poolLimit && recommended.length > 0
        ? fillExperiencePool(
            trimmed,
            recommended.map((r) => r.id),
            poolLimit,
          )
        : trimmed;
    const samePool =
      nextPool.length === selectedExperienceIds.length
      && nextPool.every((id, i) => id === selectedExperienceIds[i]);
    if (samePool && experiencePoolLimit === poolLimit) return;
    setDraft({
      experiencePoolLimit: poolLimit,
      selectedExperienceIds: nextPool,
      sectionExperienceIds: assignToSections(sectionTitles, nextPool),
    });
    // 문항 구성·목표 글자 수에 맞춰 품질 기준 개수와 배정을 맞춘다.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poolLimit
  }, [poolLimit]);

  const toggleSectionExperience = (sectionIndex: number, id: string) => {
    if (!selectedExperienceSet.has(id)) return;
    const nextRows = alignedSectionExperienceIds.map((row, i) => {
      if (i !== sectionIndex) return row;
      if (row.includes(id)) return row.filter((x) => x !== id);
      if (row.length >= sectionExperienceCap(sectionNeeds[sectionIndex] ?? 0)) return row;
      return [...row, id];
    });
    setDraft({ sectionExperienceIds: nextRows });
    if (result?.content) clearVisibleResult();
  };

  const distributeSectionExperiences = () => {
    setDraft({
      sectionExperienceIds: assignToSections(sectionTitles, selectedExperienceIds),
    });
    if (result?.content) clearVisibleResult();
  };

  const resolveSectionExperienceIds = (titles: string[]) => {
    const aligned = alignSectionExperienceIds(titles, alignedSectionExperienceIds);
    if (titles.length === 0) return [];
    if (aligned.some((row) => row.length > 0)) return aligned;
    return assignToSections(titles, selectedExperienceIds);
  };

  const addSectionTitle = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || sectionTitles.includes(trimmed) || sectionTitles.length >= MAX_SECTIONS) return;
    const nextTitles = [...sectionTitles, trimmed];
    const nextChars = [
      ...alignSectionTargetChars(sectionTitles, sectionTargetChars),
      DEFAULT_SECTION_TARGET_CHARS,
    ];
    const nextLimit = qualityExperiencePoolLimit(nextTitles, [], nextChars);
    const nextPool = selectedExperienceIds.slice(0, nextLimit);
    setDraft({
      sectionTitles: nextTitles,
      sectionTargetChars: nextChars,
      experiencePoolLimit: nextLimit,
      selectedExperienceIds: nextPool,
      sectionExperienceIds: assignToSections(nextTitles, nextPool, undefined, [], nextChars),
      sectionIntents: [],
      sectionIntentsKey: '',
    });
    if (result?.content) clearVisibleResult();
  };
  const removeSectionTitle = (index: number) => {
    const nextTitles = sectionTitles.filter((_, i) => i !== index);
    const nextChars = alignSectionTargetChars(sectionTitles, sectionTargetChars).filter((_, i) => i !== index);
    const nextLimit = qualityExperiencePoolLimit(nextTitles, [], nextChars);
    const nextPool = selectedExperienceIds.slice(0, nextLimit);
    setDraft({
      sectionTitles: nextTitles,
      sectionTargetChars: nextChars,
      experiencePoolLimit: nextLimit,
      selectedExperienceIds: nextPool,
      sectionExperienceIds: assignToSections(nextTitles, nextPool, undefined, [], nextChars),
      sectionIntents: [],
      sectionIntentsKey: '',
    });
    if (result?.content) clearVisibleResult();
  };
  const moveSectionTitle = (index: number, delta: number) => {
    const next = [...sectionTitles];
    const chars = alignSectionTargetChars(sectionTitles, sectionTargetChars);
    const rows = [...alignedSectionExperienceIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    [chars[index], chars[target]] = [chars[target], chars[index]];
    [rows[index], rows[target]] = [rows[target], rows[index]];
    setDraft({ sectionTitles: next, sectionTargetChars: chars, sectionExperienceIds: rows });
    if (result?.content) clearVisibleResult();
  };
  const setSectionTargetChar = (index: number, value: number) => {
    const chars = alignSectionTargetChars(sectionTitles, sectionTargetChars);
    chars[index] = clampSectionTargetChars(value);
    const nextLimit = qualityExperiencePoolLimit(sectionTitles, sectionIntents, chars);
    const nextPool = selectedExperienceIds.slice(0, nextLimit);
    setDraft({
      sectionTargetChars: chars,
      experiencePoolLimit: nextLimit,
      selectedExperienceIds: nextPool,
      sectionExperienceIds: assignToSections(sectionTitles, nextPool, undefined, sectionIntents, chars),
    });
    if (result?.content) clearVisibleResult();
  };

  const saveStatus = mergeSaveStatus(draftSaveStatus, resultSaveStatus);
  const hasSavedContent =
    !!jobText ||
    !!selectedPostingId ||
    rewriteLevel !== 40 ||
    sectionTitles.length > 0 ||
    !!result?.content ||
    recommended.length > 0 ||
    interview.length > 0 ||
    !!keywords;

  const handleClearDraft = () => {
    clearDraft();
    clearResult();
    setError('');
  };

  const { data: postings = [] } = useQuery({ queryKey: ['job-postings'], queryFn: api.listJobPostings });
  const sharedPostings = useMemo(() => postings.filter((p) => p.shared), [postings]);
  const myPostings = useMemo(
    () => postings.filter((p) => p.owned !== false && !p.shared),
    [postings],
  );
  const { data: allResumes = [] } = useQuery({ queryKey: ['resumes'], queryFn: () => api.listResumes() });
  const writtenPostingIds = useMemo(() => {
    const ids = postingIdsWithSavedLetter();
    const currentContent = result?.content;
    if (selectedPostingId && typeof currentContent === 'string' && currentContent.trim()) {
      ids.add(selectedPostingId);
    }
    for (const resume of allResumes) {
      if (resume.jobPostingId && resume.latestContent?.trim()) {
        ids.add(resume.jobPostingId);
      }
    }
    return ids;
  }, [allResumes, result, selectedPostingId, resultSaveStatus]);
  const selectedPosting = postings.find((p) => p.id === selectedPostingId);

  const experiencePoolItems = useMemo(
    () =>
      selectedExperienceIds.map((id) => {
        const rec = recommended.find((r) => r.id === id);
        const exp = experienceById.get(id);
        return { id, title: rec?.title || exp?.title || id };
      }),
    [selectedExperienceIds, recommended, experienceById],
  );

  const selectedReadiness = useMemo(() => {
    let ready = 0;
    let thin = 0;
    let empty = 0;
    for (const id of selectedExperienceIds) {
      const exp = experienceById.get(id);
      const r = exp ? experienceReadiness(exp) : 'empty';
      if (r === 'ready') ready += 1;
      else if (r === 'thin') thin += 1;
      else empty += 1;
    }
    return { ready, thin, empty, total: selectedExperienceIds.length };
  }, [selectedExperienceIds, experienceById]);

  const generateBlocked =
    selectedReadiness.total === 0 || (selectedReadiness.ready < 1 && selectedReadiness.thin === 0);
  const needsThinConfirm = selectedReadiness.ready < 1 && selectedReadiness.thin > 0;
  const rewriteHigh = rewriteLevel >= 70;

  const recommendTotalPages = Math.max(1, Math.ceil(recommended.length / RECOMMEND_PAGE_SIZE));
  const recommendPageSafe = Math.min(recommendPage, recommendTotalPages);
  const recommendFrom = recommended.length === 0 ? 0 : (recommendPageSafe - 1) * RECOMMEND_PAGE_SIZE + 1;
  const recommendTo = Math.min(recommendPageSafe * RECOMMEND_PAGE_SIZE, recommended.length);
  const pagedRecommended = recommended.slice(
    (recommendPageSafe - 1) * RECOMMEND_PAGE_SIZE,
    recommendPageSafe * RECOMMEND_PAGE_SIZE,
  );

  const { data: savedResumesForPosting = [] } = useQuery({
    queryKey: ['resumes-by-posting', selectedPostingId],
    queryFn: () => api.listResumes(selectedPostingId),
    enabled: !!selectedPostingId,
  });
  const primarySavedResume = savedResumesForPosting[0];
  const { data: resumeVersions = [] } = useQuery({
    queryKey: ['resume-versions', primarySavedResume?.id],
    queryFn: () => api.listResumeVersions(primarySavedResume!.id),
    enabled: !!primarySavedResume?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ content, name }: { content: string; name: string }) => {
      const existing = savedResumesForPosting[0];
      if (existing?.id) {
        const data = await api.createResumeVersion(existing.id, content, name);
        return { kind: 'version' as const, data };
      }
      const data = await api.createResume({
        title: name,
        companyName: selectedPosting?.companyName,
        content,
        jobPostingId: selectedPostingId || undefined,
      });
      const versions = await api.listResumeVersions(data.id);
      return { kind: 'resume' as const, data, versionId: versions[0]?.id };
    },
    onSuccess: (res, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resumes-by-posting', selectedPostingId] });
      if (res.kind === 'version') {
        queryClient.invalidateQueries({ queryKey: ['resume-versions', res.data.resumeId] });
        setLoadedVersionId(res.data.id);
      } else if (res.versionId) {
        queryClient.invalidateQueries({ queryKey: ['resume-versions', res.data.id] });
        setLoadedVersionId(res.versionId);
      }
      setSaveDialogOpen(false);
      toast.success(t('workspace.saveNamedSuccess', { name }));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('workspace.saveToDashboardFailed')),
  });

  const loadSavedVersion = (content: string, versionId?: string) => {
    const titles = (savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles).slice(0, MAX_SECTIONS);
    setBundle({
      result: { content },
      sectionTitles: titles,
      sectionStatuses: sectionsFromResponse({ content }, titles),
    });
    setJustGenerated(false);
    setEditingSectionIndex(null);
    setLoadedVersionId(versionId ?? '');
    toast.message(t('workspace.historyLoaded'));
  };

  const applyEditedContent = (index: number | 'all', text: string) => {
    if (index === 'all') {
      const titles = (savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles).slice(0, MAX_SECTIONS);
      setBundle({
        result: { ...(result ?? {}), content: text },
        sectionStatuses: sectionsFromResponse({ content: text }, titles),
      });
    } else {
      const titles = (savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles).slice(0, MAX_SECTIONS);
      const statusByIndex = new Map(sectionStatuses.map((s) => [s.index, s]));
      const nextStatuses = titles.map((title, i) => {
        const prev = statusByIndex.get(i);
        return {
          index: i,
          title,
          content: i === index ? text : (prev?.content ?? ''),
          status: 'ok' as const,
        };
      });
      setBundle({
        result: { ...(result ?? {}), content: nextStatuses.map((s) => s.content).join('\n\n') },
        sectionTitles: titles,
        sectionStatuses: nextStatuses,
      });
    }
    setEditingSectionIndex(null);
    setLoadedVersionId('');
  };

  useEffect(() => {
    if (!selectedPostingId || result?.content) return;
    const saved = savedResumesForPosting[0];
    if (saved?.latestContent) {
      const titles = sectionTitles.slice(0, MAX_SECTIONS);
      const content = saved.latestContent;
      setBundle({
        result: { content },
        sectionTitles: titles,
        sectionStatuses: sectionsFromResponse({ content }, titles),
      });
    }
  }, [selectedPostingId, savedResumesForPosting, result?.content, sectionTitles, setBundle]);

  const { data: jobAnalysisPreview } = useQuery({
    queryKey: ['job-analysis-preview', selectedPostingId],
    queryFn: () => api.getJobAnalysis(selectedPostingId),
    enabled: !!selectedPostingId,
  });

  const getJobContext = async () => {
    let jobAnalysis: Record<string, unknown> = { raw_content: jobText };
    let kw: string[] = buildRecommendKeywords(null, jobText);
    if (selectedPostingId) {
      const analysis = await api.getJobAnalysis(selectedPostingId);
      jobAnalysis = {
        company_name: analysis.companyName,
        position: analysis.position,
        required_skills: analysis.requiredSkills,
        preferred_skills: analysis.preferredSkills,
        tech_keywords: analysis.techKeywords,
        talent_profile: analysis.talentProfile,
        job_responsibilities: analysis.jobResponsibilities,
        pain_points: analysis.painPoints ?? [],
        must_solve: analysis.mustSolve ?? [],
      };
      kw = buildRecommendKeywords(analysis, jobText);
    }
    return { jobAnalysis, keywords: kw, jobPostingId: selectedPostingId || undefined };
  };

  const recommendSeq = useRef(0);

  const ensureExperienceEmbeddings = async () => {
    if (typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(EXPERIENCE_REEMBED_SESSION_KEY)) return;
    try {
      await api.reembedAllExperiences();
      sessionStorage.setItem(EXPERIENCE_REEMBED_SESSION_KEY, '1');
    } catch {
      // 재임베딩 실패해도 기존 벡터로 추천 시도
    }
  };

  const handleRecommend = async () => {
    if (!jobText && !selectedPostingId) {
      setBundle({ recommended: [] });
      setDraft({
        selectedExperienceIds: [],
        sectionExperienceIds: alignSectionExperienceIds(sectionTitles, []),
      });
      return;
    }
    const seq = ++recommendSeq.current;
    setRecommendLoading(true);
    setRecommendError('');
    try {
      await ensureExperienceEmbeddings();
      if (seq !== recommendSeq.current) return;
      const { keywords: kw } = await getJobContext();
      // 문항 제목은 쿼리에서 제외 — 공고(회사·직무·스킬·JD)만으로 변별
      const rec = await api.recommendExperiences(kw, RECOMMEND_FETCH_LIMIT, RECOMMEND_MIN_SCORE);
      if (seq !== recommendSeq.current) return;
      setRecommendPage(1);
      const recMetas: ExperienceAssignMeta[] = rec.map((r) => {
        const exp = experienceById.get(r.id);
        return {
          id: r.id,
          type: r.type || exp?.type,
          title: r.title || exp?.title,
          score: r.score,
          description: r.description || exp?.description,
          skills: exp?.skills,
        };
      });
      setBundle({
        recommended: rec.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          score: r.score,
          description: r.description,
        })),
      });
      const allowed = new Set(rec.map((r) => r.id));
      const ranked = rec.map((r) => r.id);
      const kept = fillExperiencePool(
        selectedExperienceIds.filter((id) => allowed.has(id)),
        ranked,
        poolLimit,
      );
      setDraft({
        selectedExperienceIds: kept,
        sectionExperienceIds: assignToSections(sectionTitles, kept, recMetas),
      });
    } catch (err) {
      if (seq !== recommendSeq.current) return;
      setRecommendError(err instanceof Error ? err.message : t('workspace.recommendFailed'));
    } finally {
      if (seq === recommendSeq.current) setRecommendLoading(false);
    }
  };

  // 공고·공고 텍스트가 바뀌면 관련 경험 추천을 자동 갱신 (문항 제목은 추천 쿼리에 미포함)
  useEffect(() => {
    if (!jobText && !selectedPostingId) {
      setBundle({ recommended: [] });
      setDraft({
        selectedExperienceIds: [],
        sectionExperienceIds: alignSectionExperienceIds(sectionTitles, []),
      });
      return;
    }
    const delay = selectedPostingId ? 200 : 500;
    const timer = window.setTimeout(() => {
      void handleRecommend();
    }, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 공고/공고텍스트 변경 시에만 자동 추천
  }, [selectedPostingId, jobText]);

  const handleRegenerateSection = async (index: number) => {
    setError('');
    if (generateBlocked) {
      setError(
        selectedReadiness.total === 0
          ? t('workspace.preflightNeedSelect')
          : t('workspace.preflightNeedReady'),
      );
      return;
    }
    const titles =
      (savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles).slice(0, MAX_SECTIONS);
    if (index < 0 || index >= titles.length) return;

    setSectionLoadingIndex(index);
    setEditingSectionIndex(null);
    setBundle((prev) => ({
      ...prev,
      sectionStatuses: prev.sectionStatuses.map((s) =>
        s.index === index ? { ...s, status: 'loading' as const } : s,
      ),
    }));

    try {
      const { jobAnalysis, keywords: kw, jobPostingId } = await getJobContext();
      const existing =
        sectionStatuses.length === titles.length
          ? titles.map((_, i) => sectionStatuses.find((s) => s.index === i)?.content ?? '')
          : alignParagraphsToTitles(splitParagraphs(String(result?.content ?? '')), titles);
      const targetChars = alignSectionTargetChars(
        titles,
        sectionTitles.length === titles.length
          ? sectionTargetChars
          : titles.map(() => DEFAULT_SECTION_TARGET_CHARS),
      );

      const res = await api.generateAi({
        keywords: kw,
        rewriteLevel,
        jobAnalysis,
        jobPostingId,
        sectionTitles: titles,
        experienceIds: selectedExperienceIds.slice(0, poolLimit),
        sectionExperienceIds: resolveSectionExperienceIds(titles),
        sectionIndex: index,
        existingParagraphs: existing,
        sectionTargetChars: targetChars,
        userInstruction: (regenInstructions[index] ?? '').trim() || undefined,
        skipPostprocess: true,
      });
      const nextStatuses = sectionsFromResponse(res, titles);
      setBundle((prev) => ({
        ...prev,
        result: {
          ...(prev.result ?? {}),
          ...res,
          quality_scores: res.quality_scores ?? prev.result?.quality_scores,
          detections: prev.result?.detections ?? [],
          reviews: prev.result?.reviews ?? [],
        },
        sectionTitles: titles,
        sectionStatuses: nextStatuses,
      }));
      setJustGenerated(false);
      setRegenPromptOpenIndex(null);
    } catch (err) {
      setBundle((prev) => ({
        ...prev,
        sectionStatuses: prev.sectionStatuses.map((s) =>
          s.index === index
            ? {
                ...s,
                status: 'error' as const,
                error: err instanceof Error ? err.message : t('workspace.sectionRegenFailed'),
              }
            : s,
        ),
      }));
      setError(err instanceof Error ? err.message : t('workspace.sectionRegenFailed'));
    } finally {
      setSectionLoadingIndex(null);
    }
  };

  const handleRefreshInterview = async (contentOverride?: string) => {
    const content = (contentOverride ?? String(result?.content ?? '')).trim();
    if (!content) return;
    setPanelLoading((prev) => ({ ...prev, interview: true }));
    setBundle({ interviewStatus: 'loading' });
    try {
      const iq = await api.interviewQuestions(content);
      setBundle({
        interview: (iq.questions as typeof interview) || [],
        interviewStatus: 'ok',
      });
    } catch (err) {
      setBundle({ interviewStatus: 'error' });
      toast.error(err instanceof Error ? err.message : t('workspace.interviewFailed'));
    } finally {
      setPanelLoading((prev) => ({ ...prev, interview: false }));
    }
  };

  const handleRefreshKeywords = async (contentOverride?: string) => {
    const content = (contentOverride ?? String(result?.content ?? '')).trim();
    if (!content) return;
    setPanelLoading((prev) => ({ ...prev, keywords: true }));
    setBundle({ keywordsStatus: 'loading' });
    try {
      const { keywords: kw } = await getJobContext();
      const nextKeywords = await api.compareKeywords(kw, content);
      setBundle({ keywords: nextKeywords, keywordsStatus: 'ok' });
    } catch (err) {
      setBundle({ keywordsStatus: 'error' });
      toast.error(err instanceof Error ? err.message : t('workspace.keywordsFailed'));
    } finally {
      setPanelLoading((prev) => ({ ...prev, keywords: false }));
    }
  };

  const handleRefreshDiagnosis = async () => {
    const content = String(result?.content ?? '');
    if (!content.trim()) return;
    setPanelLoading((prev) => ({ ...prev, diagnosis: true }));
    setBundle({ diagnosisStatus: 'loading' });
    try {
      const { jobAnalysis } = await getJobContext();
      const [detectRes, reviewRes] = await Promise.all([
        api.detectAi(content),
        api.reviewAi(content, jobAnalysis),
      ]);
      setBundle((prev) => ({
        ...prev,
        result: {
          ...(prev.result ?? {}),
          detections: detectRes.detections ?? [],
          reviews: reviewRes.reviews ?? [],
          quality_scores: {
            ...detectScorePatch(detectRes, {
              ...((prev.result?.quality_scores as Record<string, unknown>) ?? {}),
              ...((reviewRes.scores as Record<string, unknown>) ?? {}),
            }),
            scored_by: 'llm',
          },
        },
        diagnosisStatus: 'ok',
      }));
    } catch (err) {
      setBundle({ diagnosisStatus: 'error' });
      toast.error(err instanceof Error ? err.message : t('workspace.diagnosisFailed'));
    } finally {
      setPanelLoading((prev) => ({ ...prev, diagnosis: false }));
    }
  };

  const handleHumanizeAiTraces = async (sentences?: string[]) => {
    const content = String(result?.content ?? '');
    if (!content.trim() || loading || sectionLoadingIndex !== null) return;
    setPanelLoading((prev) => ({ ...prev, humanize: true }));
    try {
      const wholeDocument = sentences === undefined;
      const targets = wholeDocument
        ? []
        : sentences.map((s) => s.trim()).filter(Boolean);
      if (!wholeDocument && targets.length === 0) {
        toast.message(t('workspace.humanizeNone'));
        return;
      }
      const res = await api.humanizeAi(content, targets);
      const nextContent = String(res.content ?? content);
      const changed = Number(res.changed_count ?? 0);
      const analysis = res.analysis;
      const findings = Array.isArray(analysis?.findings) ? analysis.findings : [];
      const replacements = Array.isArray(res.replacements) ? res.replacements : [];
      if ((changed === 0 || nextContent === content) && findings.length === 0) {
        toast.message(t('workspace.humanizeNone'));
        return;
      }
      const titles = (savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles).slice(0, MAX_SECTIONS);
      setLoadedVersionId('');
      setJustGenerated(false);
      const patchedContent = changed > 0 && nextContent !== content ? nextContent : content;
      const stayOnDiagnosis = rightTab === 'diagnosis';
      const contentChanged = patchedContent !== content;
      setBundle((prev) => ({
        ...prev,
        result: {
          ...(prev.result ?? {}),
          content: patchedContent,
          humanize_analysis: analysis ?? null,
          humanize_replacements: replacements,
          humanize_before: contentChanged ? content : prev.result?.humanize_before,
        },
        sectionStatuses: sectionsFromResponse({ content: patchedContent }, titles),
        diagnosisStatus: 'ok',
      }));
      if (stayOnDiagnosis) setRightTab('diagnosis');
      else if (contentChanged) {
        setRightTab('result');
        setResultView('diff');
      }
      if (contentChanged || changed > 0) {
        const detectRes = await api.detectAi(patchedContent);
        setBundle((prev) => ({
          ...prev,
          result: {
            ...(prev.result ?? {}),
            content: patchedContent,
            humanize_analysis: analysis ?? prev.result?.humanize_analysis,
            humanize_replacements: replacements,
            humanize_before: contentChanged ? content : prev.result?.humanize_before,
            detections: detectRes.detections ?? [],
            quality_scores: detectScorePatch(
              detectRes,
              (prev.result?.quality_scores as Record<string, unknown>) ?? {},
            ),
          },
          diagnosisStatus: 'ok',
        }));
      }
      if (changed > 0 && patchedContent !== content) {
        toast.success(t('workspace.humanizeSuccess', { count: changed }));
      } else {
        toast.message(t('workspace.humanizeReportOnly'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('workspace.humanizeFailed'));
    } finally {
      setPanelLoading((prev) => ({ ...prev, humanize: false }));
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { jobAnalysis, keywords: kw, jobPostingId } = await getJobContext();
      const titles = sectionTitles.slice(0, MAX_SECTIONS);
      const res = await api.generateAi({
        keywords: kw,
        rewriteLevel,
        jobAnalysis,
        jobPostingId,
        sectionTitles: titles,
        experienceIds: selectedExperienceIds.slice(0, poolLimit),
        sectionExperienceIds: resolveSectionExperienceIds(titles),
        sectionTargetChars: alignSectionTargetChars(titles, sectionTargetChars),
      });
      const nextStatuses = sectionsFromResponse(res, titles);
      const content = String(res.content ?? '');
      setLoadedVersionId('');
      setEditingSectionIndex(null);
      setResultView('letter');
      setBundle({
        result: res,
        sectionTitles: titles,
        sectionStatuses: nextStatuses,
        interview: [],
        keywords: null,
        interviewStatus: content.trim() ? 'loading' : 'idle',
        keywordsStatus: content.trim() ? 'loading' : 'idle',
        diagnosisStatus: Array.isArray(res.detections) && (res.detections as unknown[]).length > 0 ? 'ok' : 'idle',
      });
      setJustGenerated(true);
      // 생성 후 키워드·면접 자동 실행. 실패/재생성은 각 버튼으로.
      if (content.trim()) {
        void Promise.all([
          handleRefreshKeywords(content),
          handleRefreshInterview(content),
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('workspace.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const requestGenerate = () => {
    setError('');
    if (generateBlocked) {
      setError(
        selectedReadiness.total === 0
          ? t('workspace.preflightNeedSelect')
          : t('workspace.preflightNeedReady'),
      );
      return;
    }
    if (needsThinConfirm) {
      setThinConfirmOpen(true);
      return;
    }
    void handleGenerate();
  };

  const detections = (result?.detections as Array<{ sentence: string; level: string; reason: string }>) || [];
  const humanizeAnalysis = result?.humanize_analysis as HumanizeAnalysis | undefined;
  const humanizeFindings = humanizeAnalysis?.findings ?? [];
  const humanizeReplacements = (result?.humanize_replacements as HumanizeReplacement[] | undefined) ?? [];
  const humanizeBefore = String(result?.humanize_before ?? '');
  const currentLetter = String(result?.content ?? '');
  const canCompareHumanize = humanizeBefore.length > 0 && humanizeBefore !== currentLetter;
  const reviews = (result?.reviews as Array<{ paragraph_index: number; strengths: unknown; weaknesses: unknown; improvement: string }>) || [];
  const scores = result?.quality_scores as Record<string, number> | undefined;
  const { displayed: displayedResult, isTyping, skip: skipTyping } = useTypewriter(
    String(result?.content ?? ''),
    justGenerated,
    () => setJustGenerated(false),
  );
  const previewChips = jobAnalysisPreview
    ? (() => {
        const techKeywords = asArray(jobAnalysisPreview.techKeywords);
        const requiredSkills = asArray(jobAnalysisPreview.requiredSkills);
        return (techKeywords.length ? techKeywords : requiredSkills).slice(0, 8);
      })()
    : [];
  const defaultSaveName = () => {
    const loaded = resumeVersions.find((v) => v.id === loadedVersionId);
    if (loaded) {
      const named = versionLabel(loaded, '');
      if (named) return named;
    }
    return selectedPosting?.title || selectedPosting?.companyName || t('workspace.title');
  };

  const openSaveDialog = () => {
    setSaveName(defaultSaveName());
    setSaveDialogOpen(true);
  };

  const submitSave = () => {
    const name = saveName.trim();
    if (!name || !result?.content) return;
    saveMutation.mutate({ content: String(result.content), name });
  };

  const historySelectValue = resumeVersions.some((v) => v.id === loadedVersionId)
    ? loadedVersionId
    : undefined;

  const leftPanel = (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <WorkspacePanelTitle icon={Briefcase}>{t('workspace.step1')}</WorkspacePanelTitle>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {t('workspace.step1Hint')}
          </p>
          {postings.length > 0 && (
            <div className="space-y-2">
              <Label>{t('jobPostings.saved')}</Label>
              <Select
                value={selectedPostingId || '__none__'}
                onValueChange={(v) => setDraft({ selectedPostingId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('workspace.newOrManual')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('workspace.newOrManual')}</SelectItem>
                  {sharedPostings.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t('workspace.sharedGroup')}</SelectLabel>
                      {sharedPostings.map((p: JobPostingResponse) => {
                        const written = writtenPostingIds.has(p.id);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">{p.title || p.companyName}</span>
                              {written && (
                                <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
                                  {t('workspace.writtenBadge')}
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                  {myPostings.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t('workspace.mineGroup')}</SelectLabel>
                      {myPostings.map((p: JobPostingResponse) => {
                        const written = writtenPostingIds.has(p.id);
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate">{p.title || p.companyName}</span>
                              {written && (
                                <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
                                  {t('workspace.writtenBadge')}
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('workspace.writtenHint')}</p>
            </div>
          )}
          {selectedPostingId && resumeVersions.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <History className="size-3.5" />
                {t('workspace.historyLabel')}
              </Label>
              <Select
                value={historySelectValue}
                onValueChange={(id) => {
                  const version = resumeVersions.find((v) => v.id === id);
                  if (version?.content) loadSavedVersion(version.content, version.id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('workspace.historyPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {resumeVersions.map((v) => {
                    const date = formatHistoryDate(v.createdAt, i18n.language);
                    const name = versionLabel(v, date);
                    return (
                      <SelectItem key={v.id} value={v.id}>
                        {name !== date ? `${name} · ${date}` : name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('workspace.historyHint')}</p>
            </div>
          )}
          {selectedPostingId ? (
            previewChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {previewChips.map((kw) => (
                  <Badge key={kw} variant="secondary" className="font-normal">
                    {kw}
                  </Badge>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              <Label>{t('workspace.jobPlaceholder')}</Label>
              <Textarea
                data-testid="workspace-job-input"
                value={jobText}
                onChange={(e) => setDraft({ jobText: e.target.value })}
                placeholder={t('workspace.jobPlaceholder')}
                className="min-h-32 resize-none"
              />
            </div>
          )}
          {selectedPostingId && <p className="text-xs text-muted-foreground">{t('workspace.jobTextDisabledHint')}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <WorkspacePanelTitle icon={ListPlus}>{t('workspace.step2Title')}</WorkspacePanelTitle>
          <p className="text-xs text-muted-foreground">{t('workspace.sectionTitlesDesc')}</p>
          <p className="text-xs text-muted-foreground">
            {t('workspace.sectionTitlesLimit', { max: MAX_SECTIONS, count: sectionTitles.length })}
          </p>

          {sectionTitles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-pretty text-muted-foreground">{t('workspace.sectionExperienceHint')}</p>
              <p className="text-xs text-pretty text-muted-foreground">{t('workspace.sectionRagRule')}</p>
              <p className="text-xs text-pretty text-muted-foreground">{t('workspace.consistencyHint')}</p>
              <p className="text-xs text-pretty text-muted-foreground">{t('workspace.sectionExperienceAutoHint')}</p>
              {selectedExperienceIds.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={distributeSectionExperiences}>
                  {t('workspace.sectionExperienceAuto')}
                </Button>
              )}
            </div>
          )}

          {sectionTitles.length > 0 && (
            <ol className="space-y-2">
              {sectionTitles.map((title, i) => {
                const chars = alignedTargetChars;
                const cap = sectionExperienceCap(sectionNeeds[i] ?? 0);
                return (
                  <li key={`${title}-${i}`} className="space-y-1.5 rounded-md border bg-muted/20 px-2 py-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                      <span className="flex-1 break-words">{title}</span>
                      <button type="button" onClick={() => moveSectionTitle(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => moveSectionTitle(i, 1)} disabled={i === sectionTitles.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => removeSectionTitle(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <SectionTargetCharsField
                      value={chars[i]}
                      ragCount={cap}
                      onCommit={(n) => setSectionTargetChar(i, n)}
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('workspace.sectionExperienceLabel')}</p>
                      <SectionExperiencePicker
                        pool={experiencePoolItems}
                        assignedIds={alignedSectionExperienceIds[i] ?? []}
                        emptyLabel={t('workspace.sectionExperienceEmpty')}
                        max={cap}
                        countLabel={t('workspace.sectionExperienceCount', {
                          count: alignedSectionExperienceIds[i]?.length ?? 0,
                          max: cap,
                        })}
                        onToggle={(id) => toggleSectionExperience(i, id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="flex flex-wrap gap-1.5">
            {SECTION_TITLE_PRESETS.filter((p) => !sectionTitles.includes(p)).map((p) => (
              <Button
                key={p}
                type="button"
                variant="outline"
                size="sm"
                disabled={sectionTitles.length >= MAX_SECTIONS}
                onClick={() => addSectionTitle(p)}
              >
                <Plus className="size-3.5" /> {p}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSectionTitle(customTitle);
                  setCustomTitle('');
                }
              }}
              placeholder={t('workspace.sectionTitleCustomPlaceholder')}
              className="flex-1"
              disabled={sectionTitles.length >= MAX_SECTIONS}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={sectionTitles.length >= MAX_SECTIONS}
              onClick={() => {
                addSectionTitle(customTitle);
                setCustomTitle('');
              }}
            >
              {t('workspace.sectionTitleAdd')}
            </Button>
          </div>

          <div className="border-t pt-3">
            {recommendError && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription>{recommendError}</AlertDescription>
              </Alert>
            )}
            <div className="mb-2 space-y-1">
              <p className="text-xs text-muted-foreground">{t('workspace.recommendAutoHint')}</p>
              <p className="text-xs text-muted-foreground">{t('workspace.recommendManualHint')}</p>
              {recommendLoading ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  {t('common.generating')}
                </span>
              ) : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="workspace-recommend-btn"
              onClick={handleRecommend}
              disabled={recommendLoading || (!jobText && !selectedPostingId)}
            >
              {recommendLoading ? t('common.generating') : t('workspace.recommend')}
            </Button>

            {recommended.length > 0 ? (
              <div className="mt-2 space-y-1.5 rounded-md border bg-background p-2">
                <p className="text-xs text-muted-foreground">{t('workspace.recommendedHint')}</p>
                <p className="text-[11px] text-muted-foreground">{t('workspace.experiencesPoolLimitHint')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('workspace.experiencesLimit', {
                    max: poolLimit,
                    count: selectedExperienceIds.length,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{t('workspace.recommendPageKeep')}</p>
                <div className="space-y-1.5">
                  {pagedRecommended.map((r) => {
                    const selected = selectedExperienceSet.has(r.id);
                    const atLimit = !selected && selectedExperienceIds.length >= poolLimit;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={atLimit}
                        onClick={() => toggleExperience(r.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm transition-colors',
                          selected ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30 hover:bg-muted/60',
                          atLimit && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span className="truncate pr-2">{r.title}</span>
                        <StatusChip label={`${(r.score * 100).toFixed(0)}%`} variant={selected ? 'primary' : 'default'} />
                      </button>
                    );
                  })}
                </div>
                {recommended.length > RECOMMEND_PAGE_SIZE ? (
                  <PaginationControls
                    page={recommendPageSafe}
                    totalPages={recommendTotalPages}
                    from={recommendFrom}
                    to={recommendTo}
                    total={recommended.length}
                    onPageChange={setRecommendPage}
                    className="pt-1"
                  />
                ) : null}
              </div>
            ) : !recommendLoading && (jobText || selectedPostingId) ? (
              <p className="mt-2 text-xs text-muted-foreground">{t('workspace.recommendEmpty')}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <WorkspacePanelTitle icon={Wand2}>{t('workspace.step3Title')}</WorkspacePanelTitle>
            <Badge variant="secondary" className="tabular-nums">{rewriteLevel}%</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{t('workspace.step2Desc')}</p>
          <Slider
            value={[rewriteLevel]}
            onValueChange={([v]) => setDraft({ rewriteLevel: v })}
            min={0}
            max={100}
            step={20}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('workspace.step2Low')}</span>
            <span>{t('workspace.step2High')}</span>
          </div>

          <div className="space-y-2 rounded-md border bg-background/80 p-3">
            <p className="text-xs font-medium">{t('workspace.preflightTitle')}</p>
            <p className="text-xs text-muted-foreground">
              {t('workspace.preflightSelected', {
                ready: selectedReadiness.ready,
                thin: selectedReadiness.thin,
                empty: selectedReadiness.empty,
                total: selectedReadiness.total,
                max: poolLimit,
              })}
            </p>
            {generateBlocked ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {selectedReadiness.total === 0
                  ? t('workspace.preflightNeedSelect')
                  : t('workspace.preflightNeedReady')}{' '}
                <Link to="/experiences" className="underline underline-offset-2">
                  {t('workspace.preflightOpenLibrary')}
                </Link>
              </p>
            ) : needsThinConfirm ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('workspace.preflightThinWarn')}</p>
            ) : assignmentShortfalls.length > 0 ? (
              <div className="space-y-1">
                {assignmentShortfalls.map((row) => (
                  <p key={row.index} className="text-xs text-amber-700 dark:text-amber-400">
                    {t('workspace.preflightSectionShort', {
                      title: row.title,
                      target: row.target,
                      need: row.need,
                      count: row.count,
                    })}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('workspace.preflightOk')}</p>
            )}
            {rewriteHigh ? (
              <p className="text-xs text-muted-foreground">{t('workspace.preflightRewriteHigh')}</p>
            ) : null}
          </div>

          <Button
            className="w-full"
            size="lg"
            data-testid="workspace-generate-btn"
            onClick={requestGenerate}
            disabled={loading || (!jobText && !selectedPostingId) || generateBlocked || !!panelLoading.humanize}
          >
            {loading ? t('common.generating') : t('workspace.generate')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('workspace.generateDraftHint')}</p>
        </CardContent>
      </Card>

      <AlertDialog open={thinConfirmOpen} onOpenChange={setThinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workspace.preflightThinConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('workspace.preflightThinConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setThinConfirmOpen(false);
                void handleGenerate();
              }}
            >
              {t('workspace.preflightThinConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const rightPanel = (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-4 pt-4 md:px-6 md:pt-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('common.generating')}
          </div>
        )}
        {panelLoading.humanize && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('workspace.humanizeBusy')}
          </div>
        )}
      </div>

      <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 w-fit md:mx-6">
          <TabsTrigger value="result" className="gap-1.5">
            <Sparkles className="size-3.5" />
            {t('workspace.tabResult')}
          </TabsTrigger>
          <TabsTrigger value="diagnosis" className="gap-1.5">
            <ClipboardCheck className="size-3.5" />
            {t('workspace.tabDiagnosis')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="result" className="mt-0 flex-1 overflow-y-auto border-t p-4 md:p-6">
          {result?.content ? (
            <div className="space-y-6" data-testid="workspace-result-content">
              <div className="flex flex-wrap items-center justify-end gap-3">
                {isTyping && (
                  <button type="button" onClick={skipTyping} className="text-xs text-muted-foreground underline hover:text-foreground">
                    {t('workspace.skipTyping')}
                  </button>
                )}
                {canCompareHumanize && (
                  <>
                    <Button
                      type="button"
                      variant={resultView !== 'diff' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setResultView('letter')}
                    >
                      {t('workspace.humanizeViewAfter')}
                    </Button>
                    <Button
                      type="button"
                      variant={resultView === 'diff' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-1.5"
                      data-testid="workspace-humanize-diff-btn"
                      onClick={() => setResultView('diff')}
                    >
                      <Columns2 className="size-3.5" />
                      {t('workspace.humanizeViewDiff')}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  data-testid="workspace-humanize-btn"
                  disabled={
                    loading
                    || sectionLoadingIndex !== null
                    || isTyping
                    || !!panelLoading.humanize
                    || saveMutation.isPending
                  }
                  onClick={() => void handleHumanizeAiTraces()}
                >
                  {panelLoading.humanize ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  {t('workspace.humanizeAll')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  data-testid="workspace-save-btn"
                  disabled={saveMutation.isPending || !!panelLoading.humanize}
                  onClick={openSaveDialog}
                >
                  <Save className="size-3.5" />
                  {t('workspace.saveToDashboard')}
                </Button>
                <ResumeExportMenu
                  title={primarySavedResume?.title || selectedPosting?.title || t('workspace.title')}
                  content={currentLetter}
                  resumeId={primarySavedResume?.id}
                />
              </div>

              {resultView === 'diff' && canCompareHumanize ? (
                <ProseDiffView
                  before={humanizeBefore}
                  after={currentLetter}
                  replacements={humanizeReplacements}
                />
              ) : (() => {
                const displayTitles =
                  savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles;
                const statusByIndex = new Map(sectionStatuses.map((s) => [s.index, s]));

                if (displayTitles.length > 0 && (sectionStatuses.length > 0 || displayedResult)) {
                  const rawParagraphs = splitParagraphs(displayedResult);
                  const paragraphs =
                    sectionStatuses.length === displayTitles.length && !isTyping
                      ? displayTitles.map((_, i) => statusByIndex.get(i)?.content ?? '')
                      : alignParagraphsToTitles(rawParagraphs, displayTitles);

                  const targets = alignSectionTargetChars(displayTitles, sectionTargetChars);

                  return (
                    <div className="space-y-5">
                      {displayTitles.map((title, i) => {
                        const meta = statusByIndex.get(i);
                        const status = (sectionLoadingIndex === i
                          ? 'loading'
                          : meta?.status) ?? (paragraphs[i]?.trim() ? 'ok' : 'idle');
                        const body = paragraphs[i] ?? '';
                        const editing = editingSectionIndex === i;
                        const writtenCount = editing ? editDraft.length : body.length;
                        const targetChars = targets[i];
                        return (
                          <div
                            key={i}
                            className="space-y-2"
                            aria-busy={status === 'loading'}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {title && (
                                <h4 className="text-sm font-semibold text-primary">{title}</h4>
                              )}
                              <StatusChip
                                label={t(`workspace.sectionStatus.${status}`)}
                                variant={panelChipVariant(status)}
                              />
                              {status === 'loading' && (
                                <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                              )}
                              <WrittenCharCount count={writtenCount} target={targetChars} />
                              <div className="ml-auto flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  disabled={loading || sectionLoadingIndex !== null || isTyping || !!panelLoading.humanize}
                                  onClick={() => {
                                    setRegenPromptOpenIndex(null);
                                    setEditingSectionIndex(i);
                                    setEditDraft(body);
                                  }}
                                >
                                  <Pencil className="size-3" />
                                  {t('workspace.editSection')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  disabled={loading || sectionLoadingIndex !== null || generateBlocked || !!panelLoading.humanize}
                                  aria-busy={sectionLoadingIndex === i}
                                  onClick={() =>
                                    setRegenPromptOpenIndex((prev) => (prev === i ? null : i))
                                  }
                                >
                                  {sectionLoadingIndex === i ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="size-3" />
                                  )}
                                  {sectionLoadingIndex === i
                                    ? t('workspace.sectionStatus.loading')
                                    : t('workspace.regenSection')}
                                </Button>
                              </div>
                            </div>
                            {regenPromptOpenIndex === i && (
                              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                                <p className="text-xs text-muted-foreground">
                                  {t('workspace.regenInstructionHint')}
                                </p>
                                <Textarea
                                  rows={3}
                                  value={regenInstructions[i] ?? ''}
                                  onChange={(e) =>
                                    setRegenInstructions((prev) => ({
                                      ...prev,
                                      [i]: e.target.value,
                                    }))
                                  }
                                  placeholder={t('workspace.regenInstructionPlaceholder')}
                                  className="text-sm"
                                  disabled={sectionLoadingIndex === i}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="gap-1"
                                    disabled={loading || sectionLoadingIndex !== null || generateBlocked || !!panelLoading.humanize}
                                    onClick={() => void handleRegenerateSection(i)}
                                  >
                                    {sectionLoadingIndex === i ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                      <Wand2 className="size-3" />
                                    )}
                                    {sectionLoadingIndex === i
                                      ? t('workspace.sectionStatus.loading')
                                      : t('workspace.regenSectionRun')}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={sectionLoadingIndex === i}
                                    onClick={() => setRegenPromptOpenIndex(null)}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {status === 'error' && meta?.error && (
                              <p className="text-xs text-destructive">{meta.error}</p>
                            )}
                            {status === 'loading' ? (
                              <div
                                className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4"
                                aria-busy="true"
                                aria-live="polite"
                              >
                                <LoadingSpinner
                                  label={t('workspace.regenSectionBusy')}
                                  className="py-6"
                                />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-5/6" />
                                <Skeleton className="h-3 w-4/5" />
                              </div>
                            ) : editingSectionIndex === i ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  className="min-h-32 text-base leading-loose"
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <WrittenCharCount count={editDraft.length} target={targetChars} />
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => applyEditedContent(i, editDraft)}
                                    >
                                      {t('workspace.editSectionSave')}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingSectionIndex(null)}
                                    >
                                      {t('common.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : body.trim() ? (
                              <HighlightedContent
                                content={body}
                                detections={detections.filter((d) => body.includes(d.sentence))}
                              />
                            ) : (
                              !isTyping && (
                                <p className="text-xs text-muted-foreground">
                                  {t('workspace.sectionEmpty')}
                                </p>
                              )
                            )}
                          </div>
                        );
                      })}
                      {paragraphs.filter((p) => p.trim()).length < displayTitles.length && !isTyping && (
                        <p className="text-xs text-muted-foreground">{t('workspace.sectionTitleCountMismatch')}</p>
                      )}
                    </div>
                  );
                }
                  return (
                    <div className="space-y-2">
                      {!isTyping && editingSectionIndex !== 'all' && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => {
                              setEditingSectionIndex('all');
                              setEditDraft(displayedResult);
                            }}
                          >
                            <Pencil className="size-3" />
                            {t('workspace.editWhole')}
                          </Button>
                        </div>
                      )}
                      {editingSectionIndex === 'all' ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="min-h-48 text-base leading-loose"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <WrittenCharCount count={editDraft.length} />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => applyEditedContent('all', editDraft)}
                              >
                                {t('workspace.editSectionSave')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSectionIndex(null)}
                              >
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <WrittenCharCount count={displayedResult.length} />
                          <HighlightedContent content={displayedResult} detections={detections} />
                        </div>
                      )}
                    </div>
                  );
              })()}

              {(humanizeFindings.length > 0 || humanizeReplacements.length > 0) && (
                <HumanizeReport
                  variant="compare"
                  analysis={humanizeAnalysis}
                  findings={humanizeFindings}
                  replacements={humanizeReplacements}
                  onOpenDiagnosis={() => setRightTab('diagnosis')}
                />
              )}

              {!isTyping && !!result?.content && (
                <InlineEditChat
                  fullContent={String(result.content)}
                  onApply={(next) => applyEditedContent('all', next)}
                />
              )}

              {!isTyping && (
                <div className="animate-in fade-in space-y-6 duration-300">
                      {scores && (
                    <section className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {Object.entries(scores).filter(([k]) => SCORE_KEY_MAP[k]).map(([k, v]) => (
                        <Card key={k} size="sm">
                          <CardContent className="pt-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <p className="truncate text-xs text-muted-foreground">{SCORE_KEY_MAP[k] ? t(SCORE_KEY_MAP[k]) : k}</p>
                              {SCORE_DESC_KEY_MAP[k] && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={t('workspace.scoreHelpAria')}
                                      className="shrink-0 text-muted-foreground/70 hover:text-foreground"
                                    >
                                      <HelpCircle className="size-3" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 text-xs leading-relaxed">
                                    {t(SCORE_DESC_KEY_MAP[k])}
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            <p className="text-lg font-semibold tabular-nums">
                              {formatQualityScore(k, v, reviewScoreScale(scores))}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{t('workspace.keywordCompare')}</h3>
                      <StatusChip
                        label={t(`workspace.panelStatus.${keywordsStatus}`)}
                        variant={panelChipVariant(keywordsStatus)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 gap-1 text-xs"
                        disabled={!result?.content || !!panelLoading.keywords}
                        onClick={() => void handleRefreshKeywords()}
                      >
                        {panelLoading.keywords ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        {t('workspace.runKeywords')}
                      </Button>
                    </div>
                    {keywords ? (
                      <>
                        <p className="text-sm"><span className="text-muted-foreground">{t('workspace.matched')}:</span> {joinList(keywords.matched) || t('common.none')}</p>
                        <p className="text-sm text-destructive"><span className="text-muted-foreground">{t('workspace.missing')}:</span> {joinList(keywords.missing) || t('common.none')}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('workspace.panelIdleHint')}</p>
                    )}
                  </section>

                  <section className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{t('workspace.review')}</h3>
                      <StatusChip
                        label={t(`workspace.panelStatus.${diagnosisStatus}`)}
                        variant={panelChipVariant(diagnosisStatus)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 gap-1 text-xs"
                        disabled={!result?.content || !!panelLoading.diagnosis}
                        onClick={() => void handleRefreshDiagnosis()}
                      >
                        {panelLoading.diagnosis ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <ClipboardCheck className="size-3" />
                        )}
                        {t('workspace.runDiagnosis')}
                      </Button>
                    </div>
                    {reviews.length > 0 ? (
                      reviews.map((r) => (
                        <div key={r.paragraph_index} className="space-y-1 rounded-md border p-3 text-sm">
                          <p><strong>{t('workspace.strengths')}:</strong> {joinList(r.strengths) || t('common.none')}</p>
                          <p><strong>{t('workspace.weaknesses')}:</strong> {joinList(r.weaknesses) || t('common.none')}</p>
                          <p className="text-primary">{r.improvement}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('workspace.panelIdleHint')}</p>
                    )}
                  </section>

                  <section className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium">{t('workspace.interview')}</h3>
                      <StatusChip
                        label={t(`workspace.panelStatus.${interviewStatus}`)}
                        variant={panelChipVariant(interviewStatus)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 gap-1 text-xs"
                        disabled={!result?.content || !!panelLoading.interview}
                        onClick={() => void handleRefreshInterview()}
                      >
                        {panelLoading.interview ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3" />
                        )}
                        {t('workspace.runInterview')}
                      </Button>
                    </div>
                    {interview.length > 0 ? (
                      interview.map((q, i) => (
                        <div key={i} className="rounded-md bg-muted/50 p-3">
                          <Badge variant="outline" className="mb-1">{q.category}</Badge>
                          <p className="text-sm">{q.question}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">{t('workspace.panelIdleHint')}</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {t('workspace.resultEmpty')}
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagnosis" className="mt-0 flex-1 overflow-y-auto border-t p-4 md:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusChip
              label={t(`workspace.panelStatus.${diagnosisStatus}`)}
              variant={panelChipVariant(diagnosisStatus)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto h-7 gap-1 text-xs"
              disabled={!result?.content || !!panelLoading.diagnosis || !!panelLoading.humanize || loading || isTyping}
              onClick={() => void handleRefreshDiagnosis()}
            >
              {panelLoading.diagnosis ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ClipboardCheck className="size-3" />
              )}
              {t('workspace.runDiagnosis')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              data-testid="workspace-humanize-diagnosis-btn"
              disabled={!result?.content || !!panelLoading.humanize || loading || isTyping || sectionLoadingIndex !== null}
              onClick={() => void handleHumanizeAiTraces()}
            >
              {panelLoading.humanize ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Wand2 className="size-3" />
              )}
              {t('workspace.humanizeAll')}
            </Button>
          </div>
          {humanizeFindings.length > 0 && (
            <HumanizeReport
              className="mb-4"
              analysis={humanizeAnalysis}
              findings={humanizeFindings}
              replacements={humanizeReplacements}
            />
          )}
          {detections.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('workspace.diagnosisDesc')}</p>
              <p className="text-xs text-muted-foreground">{t('workspace.humanizeHint')}</p>
              {detections.map((d, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <StatusChip label={t(LEVEL_LABEL_KEY[d.level] ?? d.level)} variant={LEVEL_VARIANT[d.level] ?? 'default'} />
                    {(d.level === 'YELLOW' || d.level === 'RED') && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 gap-1 text-xs"
                        disabled={!!panelLoading.humanize || loading || isTyping}
                        onClick={() => void handleHumanizeAiTraces([d.sentence])}
                      >
                        {panelLoading.humanize ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Wand2 className="size-3" />
                        )}
                        {t('workspace.humanizeSentence')}
                      </Button>
                    )}
                  </div>
                  <p className="leading-relaxed">{d.sentence}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{d.reason}</p>
                </div>
              ))}
            </div>
          ) : humanizeFindings.length === 0 ? (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {t('workspace.diagnosisEmpty')}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="space-y-4" data-testid="workspace-page">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageHeader title={t('workspace.title')} className="mb-0" />
        <div className="flex items-center gap-2">
          <AutosaveIndicator status={saveStatus} />
          {hasSavedContent && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <RotateCcw className="size-3.5" />
                  {t('workspace.clearDraft')}
                </Button>
              }
              title={t('workspace.clearDraft')}
              description={t('workspace.clearDraftDesc')}
              confirmLabel={t('workspace.clearDraftConfirm')}
              cancelLabel={t('common.cancel')}
              onConfirm={handleClearDraft}
              destructive
            />
          )}
        </div>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertDescription className="text-sm">{t('workspace.guide')}</AlertDescription>
      </Alert>

      <WorkspaceLayout left={leftPanel} right={rightPanel} />

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('workspace.saveDialogTitle')}</DialogTitle>
              <DialogDescription>{t('workspace.saveDialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="workspace-save-name">{t('workspace.saveDialogName')}</Label>
              <Input
                id="workspace-save-name"
                value={saveName}
                maxLength={80}
                autoComplete="off"
                placeholder={t('workspace.saveDialogPlaceholder')}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="gap-1.5" disabled={!saveName.trim() || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {t('workspace.saveDialogAction')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
