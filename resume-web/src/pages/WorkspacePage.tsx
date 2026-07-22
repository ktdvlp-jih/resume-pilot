import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useWorkspaceDraft } from '@/hooks/use-workspace-draft';
import { useWorkspaceResult } from '@/hooks/use-workspace-result';
import { useTypewriter } from '@/hooks/use-typewriter';
import { HighlightedContent } from '@/components/HighlightedContent';
import { AutosaveIndicator } from '@/components/common/autosave-indicator';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { PageHeader } from '@/components/common/page-header';
import { WorkspaceLayout, WorkspacePanelTitle } from '@/components/workspace/workspace-layout';
import { StatusChip } from '@/components/common/status-chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

function splitParagraphs(content: string): string[] {
  return content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
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
    recommended,
    interview,
    interviewFallback,
    keywords,
    setBundle,
    clearResult,
    clearVisibleResult,
    saveStatus: resultSaveStatus,
    wasResultRestored,
  } = useWorkspaceResult(selectedPostingId);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendError, setRecommendError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<Set<string>>(new Set());
  const [justGenerated, setJustGenerated] = useState(false);

  const toggleExperience = (id: string) => {
    setSelectedExperienceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (result?.content) clearVisibleResult();
  };

  const addSectionTitle = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || sectionTitles.includes(trimmed)) return;
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
  const selectedPosting = postings.find((p) => p.id === selectedPostingId);

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
    let kw: string[] = jobText.split(/\s+/).filter(Boolean).slice(0, 20);
    if (selectedPostingId) {
      const analysis = await api.getJobAnalysis(selectedPostingId);
      jobAnalysis = {
        company_name: analysis.companyName,
        position: analysis.position,
        required_skills: analysis.requiredSkills,
        tech_keywords: analysis.techKeywords,
        talent_profile: analysis.talentProfile,
      };
      const analysisKeywords = [
        ...analysis.techKeywords,
        ...analysis.requiredSkills,
        ...analysis.preferredSkills,
        ...analysis.coreCompetencies,
      ].filter(Boolean);
      kw = analysisKeywords.length ? [...new Set(analysisKeywords)].slice(0, 30) : kw;
    }
    return { jobAnalysis, keywords: kw, jobPostingId: selectedPostingId || undefined };
  };

  const handleRecommend = async () => {
    setRecommendLoading(true);
    setRecommendError('');
    try {
      const { keywords: kw } = await getJobContext();
      // 문항 제목(성장과정/지원동기 등)도 검색어에 포함시켜, 구성한 문항이 바뀌면 추천도 함께 갱신되도록 한다.
      const rec = await api.recommendExperiences([...kw, ...sectionTitles]);
      setBundle({ recommended: rec.map((r) => ({ id: r.id, title: r.title, score: r.score })) });
    } catch (err) {
      setRecommendError(err instanceof Error ? err.message : t('workspace.recommendFailed'));
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { jobAnalysis, keywords: kw, jobPostingId } = await getJobContext();
      const res = await api.generateAi({
        keywords: kw,
        rewriteLevel,
        jobAnalysis,
        jobPostingId,
        sectionTitles,
        experienceIds: Array.from(selectedExperienceIds),
      });
      setBundle({ result: res, interview: [], interviewFallback: false, keywords: null });
      setJustGenerated(true);
      if (res.content) {
        try {
          const iq = await api.interviewQuestions(String(res.content));
          const nextInterview = (iq.questions as typeof interview) || [];
          const nextKeywords = await api.compareKeywords(kw, String(res.content));
          setBundle({
            result: res,
            interview: nextInterview,
            interviewFallback: Boolean(iq.fallback),
            keywords: nextKeywords,
          });
        } catch (followUpErr) {
          console.warn('Post-generate panels failed', followUpErr);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('workspace.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const detections = (result?.detections as Array<{ sentence: string; level: string; reason: string }>) || [];
  const reviews = (result?.reviews as Array<{ paragraph_index: number; strengths: string[]; weaknesses: string[]; improvement: string }>) || [];
  const scores = result?.quality_scores as (Record<string, number> & { scored_by?: string }) | undefined;
  const reviewsFallback = Boolean(result?.reviews_fallback);
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
              <Button key={p} type="button" variant="outline" size="sm" onClick={() => addSectionTitle(p)}>
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
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
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
            <Button
              variant="secondary"
              className="w-full"
              data-testid="workspace-recommend-btn"
              onClick={handleRecommend}
              disabled={recommendLoading || (!jobText && !selectedPostingId)}
            >
              {recommendLoading ? t('common.generating') : t('workspace.recommend')}
            </Button>

            {recommended.length > 0 && (
              <div className="mt-2 space-y-1.5 rounded-md border bg-background p-2">
                <p className="text-xs text-muted-foreground">{t('workspace.recommendedHint')}</p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {recommended.map((r) => {
                    const selected = selectedExperienceIds.has(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => toggleExperience(r.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-sm transition-colors',
                          selected ? 'border-primary bg-primary/10' : 'border-transparent bg-muted/30 hover:bg-muted/60',
                        )}
                      >
                        <span className="truncate pr-2">{r.title}</span>
                        <StatusChip label={`${(r.score * 100).toFixed(0)}%`} variant={selected ? 'primary' : 'default'} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
          <Button className="w-full" size="lg" data-testid="workspace-generate-btn" onClick={handleGenerate} disabled={loading || (!jobText && !selectedPostingId)}>
            {loading ? t('common.generating') : t('workspace.generate')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const rightPanel = (
    <div className="flex h-full flex-col">
      <div className="space-y-3 px-4 pt-4 md:px-6 md:pt-6">
        {wasResultRestored && !!result?.content && (
          <p className="text-xs text-muted-foreground">{t('workspace.resultRestored')}</p>
        )}
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
                const paragraphs = splitParagraphs(displayedResult);
                if (sectionTitles.length > 0 && sectionTitles.length === paragraphs.length) {
                  return (
                    <div className="space-y-5">
                      {paragraphs.map((p, i) => (
                        <div key={i}>
                          <h4 className="mb-1.5 text-sm font-semibold text-primary">{sectionTitles[i]}</h4>
                          <HighlightedContent content={p} detections={detections.filter((d) => p.includes(d.sentence))} />
                        </div>
                      ))}
                    </div>
                  );
                }
                return <HighlightedContent content={displayedResult} detections={detections} />;
              })()}

              {!isTyping && (
                <div className="animate-in fade-in space-y-6 duration-300">
                  {scores && (
                    <section className="space-y-2">
                      {scores.scored_by === 'rule-based' && (
                        <Badge variant="outline" className="text-muted-foreground font-normal">
                          {t('workspace.scoreFallbackNotice')}
                        </Badge>
                      )}
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

                  {keywords && (
                    <section className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{t('workspace.keywordCompare')}</h3>
                        {Boolean(keywords.fallback) && (
                          <Badge variant="outline" className="text-muted-foreground font-normal">
                            {t('workspace.keywordFallbackNotice')}
                          </Badge>
                        )}
                      </div>
                      <p><span className="text-muted-foreground">{t('workspace.matched')}:</span> {((keywords.matched as string[]) || []).join(', ') || t('common.none')}</p>
                      <p className="text-destructive"><span className="text-muted-foreground">{t('workspace.missing')}:</span> {((keywords.missing as string[]) || []).join(', ') || t('common.none')}</p>
                    </section>
                  )}

                  {reviews.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{t('workspace.review')}</h3>
                        {reviewsFallback && (
                          <Badge variant="outline" className="text-muted-foreground font-normal">
                            {t('workspace.reviewFallbackNotice')}
                          </Badge>
                        )}
                      </div>
                      {reviews.map((r) => (
                        <div key={r.paragraph_index} className="space-y-1 rounded-md border p-3 text-sm">
                          <p><strong>{t('workspace.strengths')}:</strong> {r.strengths.join(', ')}</p>
                          <p><strong>{t('workspace.weaknesses')}:</strong> {r.weaknesses.join(', ')}</p>
                          <p className="text-primary">{r.improvement}</p>
                        </div>
                      ))}
                    </section>
                  )}

                  {interview.length > 0 && (
                    <section className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{t('workspace.interview')}</h3>
                        {interviewFallback && (
                          <Badge variant="outline" className="text-muted-foreground font-normal">
                            {t('workspace.interviewFallbackNotice')}
                          </Badge>
                        )}
                      </div>
                      {interview.map((q, i) => (
                        <div key={i} className="rounded-md bg-muted/50 p-3">
                          <Badge variant="outline" className="mb-1">{q.category}</Badge>
                          <p className="text-sm">{q.question}</p>
                        </div>
                      ))}
                    </section>
                  )}
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

      {wasRestored && jobText && <p className="text-xs text-muted-foreground">{t('workspace.draftRestored')}</p>}

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertDescription className="text-sm">{t('workspace.guide')}</AlertDescription>
      </Alert>

      <WorkspaceLayout left={leftPanel} right={rightPanel} />
    </div>
  );
}
