import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  ClipboardCheck,
  HelpCircle,
  Info,
  Loader2,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { api, type JobPostingResponse } from '@/lib/api';
import {
  buildRecommendKeywords,
  EXPERIENCE_REEMBED_SESSION_KEY,
  RECOMMEND_FETCH_LIMIT,
  RECOMMEND_MIN_SCORE,
  RECOMMEND_PAGE_SIZE,
} from '@/lib/recommend-keywords';
import { experienceReadiness } from '@/lib/experience-limits';
import { useWorkspaceDraft } from '@/hooks/use-workspace-draft';
import {
  useWorkspaceResult,
  type PanelAiStatus,
  type SectionAiStatus,
  type SectionResultMeta,
} from '@/hooks/use-workspace-result';
import { useTypewriter } from '@/hooks/use-typewriter';
import { HighlightedContent } from '@/components/HighlightedContent';
import { AutosaveIndicator } from '@/components/common/autosave-indicator';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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
/** 문항 제목·경험 추천/선택 공통 상한 */
const MAX_SECTIONS = 5;
const MAX_EXPERIENCES = 5;

function splitParagraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
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

function mergeSaveStatus(a: DraftSaveStatus, b: DraftSaveStatus): DraftSaveStatus {
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { draft, setDraft, clearDraft, saveStatus: draftSaveStatus, wasRestored } = useWorkspaceDraft();
  const { selectedPostingId, jobText, rewriteLevel, sectionTitles } = draft;
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
  const [panelLoading, setPanelLoading] = useState<
    Partial<Record<'interview' | 'keywords' | 'diagnosis', boolean>>
  >({});
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendError, setRecommendError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<Set<string>>(new Set());
  const [justGenerated, setJustGenerated] = useState(false);
  const [thinConfirmOpen, setThinConfirmOpen] = useState(false);
  const [recommendPage, setRecommendPage] = useState(1);
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

  const toggleExperience = (id: string) => {
    setSelectedExperienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size >= MAX_EXPERIENCES) {
        return prev;
      } else {
        next.add(id);
      }
      return next;
    });
    if (result?.content) clearVisibleResult();
  };

  const addSectionTitle = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || sectionTitles.includes(trimmed) || sectionTitles.length >= MAX_SECTIONS) return;
    setDraft({ sectionTitles: [...sectionTitles, trimmed] });
    if (result?.content) clearVisibleResult();
  };
  const removeSectionTitle = (index: number) => {
    setDraft({ sectionTitles: sectionTitles.filter((_, i) => i !== index) });
    if (result?.content) clearVisibleResult();
  };
  const moveSectionTitle = (index: number, delta: number) => {
    const next = [...sectionTitles];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft({ sectionTitles: next });
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
    setSelectedExperienceIds(new Set());
    setError('');
  };

  const { data: postings = [] } = useQuery({ queryKey: ['job-postings'], queryFn: api.listJobPostings });
  const { data: experiences = [] } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });
  const selectedPosting = postings.find((p) => p.id === selectedPostingId);

  const experienceById = useMemo(() => {
    const map = new Map(experiences.map((e) => [e.id, e]));
    return map;
  }, [experiences]);

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
    return { ready, thin, empty, total: selectedExperienceIds.size };
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

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      api.createResume({
        title: selectedPosting?.title || selectedPosting?.companyName || t('workspace.title'),
        companyName: selectedPosting?.companyName,
        content,
        jobPostingId: selectedPostingId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      queryClient.invalidateQueries({ queryKey: ['resumes-by-posting', selectedPostingId] });
      toast.success(t('workspace.saveToDashboardSuccess'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('workspace.saveToDashboardFailed')),
  });

  const { data: savedResumesForPosting = [] } = useQuery({
    queryKey: ['resumes-by-posting', selectedPostingId],
    queryFn: () => api.listResumes(selectedPostingId),
    enabled: !!selectedPostingId,
  });

  useEffect(() => {
    if (!selectedPostingId || result?.content) return;
    const saved = savedResumesForPosting[0];
    if (saved?.latestContent) {
      setBundle({ result: { content: saved.latestContent } });
    }
  }, [selectedPostingId, savedResumesForPosting, result?.content, setBundle]);

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
      setSelectedExperienceIds(new Set());
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
      setBundle({
        recommended: rec.map((r) => ({ id: r.id, title: r.title, score: r.score })),
      });
      setSelectedExperienceIds((prev) => {
        const allowed = new Set(rec.map((r) => r.id));
        const kept = [...prev].filter((id) => allowed.has(id)).slice(0, MAX_EXPERIENCES);
        return new Set(kept);
      });    } catch (err) {
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
      setSelectedExperienceIds(new Set());
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

      const res = await api.generateAi({
        keywords: kw,
        rewriteLevel,
        jobAnalysis,
        jobPostingId,
        sectionTitles: titles,
        experienceIds: Array.from(selectedExperienceIds).slice(0, MAX_EXPERIENCES),
        sectionIndex: index,
        existingParagraphs: existing,
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
            ...((prev.result?.quality_scores as Record<string, unknown>) ?? {}),
            ...((reviewRes.scores as Record<string, unknown>) ?? {}),
            ai_trace_percent: detectRes.ai_trace_percent,
            naturalness: Math.max(0, 100 - Number(detectRes.ai_trace_percent ?? 0)),
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
        experienceIds: Array.from(selectedExperienceIds).slice(0, MAX_EXPERIENCES),
      });
      const nextStatuses = sectionsFromResponse(res, titles);
      const content = String(res.content ?? '');
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
  const reviews = (result?.reviews as Array<{ paragraph_index: number; strengths: string[]; weaknesses: string[]; improvement: string }>) || [];
  const scores = result?.quality_scores as Record<string, number> | undefined;
  const { displayed: displayedResult, isTyping, skip: skipTyping } = useTypewriter(
    String(result?.content ?? ''),
    justGenerated,
    () => setJustGenerated(false),
  );
  const previewChips = jobAnalysisPreview
    ? (jobAnalysisPreview.techKeywords.length ? jobAnalysisPreview.techKeywords : jobAnalysisPreview.requiredSkills).slice(0, 8)
    : [];

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
                  {postings.map((p: JobPostingResponse) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title || p.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <ol className="space-y-1.5">
              {sectionTitles.map((title, i) => (
                <li key={`${title}-${i}`} className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1.5 text-sm">
                  <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate">{title}</span>
                  <button type="button" onClick={() => moveSectionTitle(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSectionTitle(i, 1)} disabled={i === sectionTitles.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => removeSectionTitle(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
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
                <p className="text-xs text-muted-foreground">
                  {t('workspace.experiencesLimit', {
                    max: MAX_EXPERIENCES,
                    count: selectedExperienceIds.size,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">{t('workspace.recommendPageKeep')}</p>
                <div className="space-y-1.5">
                  {pagedRecommended.map((r) => {
                    const selected = selectedExperienceIds.has(r.id);
                    const atLimit = !selected && selectedExperienceIds.size >= MAX_EXPERIENCES;
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
                max: MAX_EXPERIENCES,
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
            disabled={loading || (!jobText && !selectedPostingId) || generateBlocked}
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
      </div>

      <Tabs defaultValue="result" className="flex flex-1 flex-col overflow-hidden">
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
              <div className="flex items-center justify-end gap-3">
                {isTyping && (
                  <button type="button" onClick={skipTyping} className="text-xs text-muted-foreground underline hover:text-foreground">
                    {t('workspace.skipTyping')}
                  </button>
                )}
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  data-testid="workspace-save-btn"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(String(result.content))}
                >
                  <Save className="size-3.5" />
                  {saveMutation.isPending ? t('common.generating') : t('workspace.saveToDashboard')}
                </Button>
              </div>

              {(() => {
                const displayTitles =
                  savedSectionTitles.length > 0 ? savedSectionTitles : sectionTitles;
                const statusByIndex = new Map(sectionStatuses.map((s) => [s.index, s]));

                if (displayTitles.length > 0 && (sectionStatuses.length > 0 || displayedResult)) {
                  const rawParagraphs = splitParagraphs(displayedResult);
                  const paragraphs =
                    sectionStatuses.length === displayTitles.length && !isTyping
                      ? displayTitles.map((_, i) => statusByIndex.get(i)?.content ?? '')
                      : alignParagraphsToTitles(rawParagraphs, displayTitles);

                  return (
                    <div className="space-y-5">
                      {displayTitles.map((title, i) => {
                        const meta = statusByIndex.get(i);
                        const status = (sectionLoadingIndex === i
                          ? 'loading'
                          : meta?.status) ?? (paragraphs[i]?.trim() ? 'ok' : 'idle');
                        const body = paragraphs[i] ?? '';
                        return (
                          <div key={i} className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {title && (
                                <h4 className="text-sm font-semibold text-primary">{title}</h4>
                              )}
                              <StatusChip
                                label={t(`workspace.sectionStatus.${status}`)}
                                variant={panelChipVariant(status)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="ml-auto h-7 gap-1 text-xs"
                                disabled={loading || sectionLoadingIndex !== null || generateBlocked}
                                onClick={() => void handleRegenerateSection(i)}
                              >
                                {sectionLoadingIndex === i ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Wand2 className="size-3" />
                                )}
                                {t('workspace.regenSection')}
                              </Button>
                            </div>
                            {status === 'error' && meta?.error && (
                              <p className="text-xs text-destructive">{meta.error}</p>
                            )}
                            {body.trim() ? (
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
                return <HighlightedContent content={displayedResult} detections={detections} />;
              })()}

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
                            <p className="text-lg font-semibold">{v}</p>
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
                        <p className="text-sm"><span className="text-muted-foreground">{t('workspace.matched')}:</span> {((keywords.matched as string[]) || []).join(', ') || t('common.none')}</p>
                        <p className="text-sm text-destructive"><span className="text-muted-foreground">{t('workspace.missing')}:</span> {((keywords.missing as string[]) || []).join(', ') || t('common.none')}</p>
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
                          <p><strong>{t('workspace.strengths')}:</strong> {(r.strengths ?? []).join(', ') || t('common.none')}</p>
                          <p><strong>{t('workspace.weaknesses')}:</strong> {(r.weaknesses ?? []).join(', ') || t('common.none')}</p>
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
          {detections.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('workspace.diagnosisDesc')}</p>
              {detections.map((d, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <StatusChip label={t(LEVEL_LABEL_KEY[d.level] ?? d.level)} variant={LEVEL_VARIANT[d.level] ?? 'default'} className="mb-1.5" />
                  <p className="leading-relaxed">{d.sentence}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{d.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              {t('workspace.diagnosisEmpty')}
            </div>
          )}
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
    </div>
  );
}
