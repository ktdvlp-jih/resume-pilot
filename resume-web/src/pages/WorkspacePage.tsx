import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Briefcase, Info, Loader2, ListPlus, Plus, RotateCcw, Sparkles, Wand2, X } from 'lucide-react';
import { api, type JobPostingResponse } from '@/lib/api';
import { useWorkspaceDraft } from '@/hooks/use-workspace-draft';
import { useWorkspaceResult } from '@/hooks/use-workspace-result';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { DraftSaveStatus } from '@/hooks/use-workspace-draft';

const LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'destructive',
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

function mergeSaveStatus(a: DraftSaveStatus, b: DraftSaveStatus): DraftSaveStatus {
  if (a === 'saving' || b === 'saving') return 'saving';
  if (a === 'saved' || b === 'saved') return 'saved';
  return 'idle';
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const { draft, setDraft, clearDraft, saveStatus: draftSaveStatus, wasRestored } = useWorkspaceDraft();
  const {
    result,
    recommended,
    interview,
    keywords,
    setBundle,
    clearResult,
    saveStatus: resultSaveStatus,
    wasResultRestored,
  } = useWorkspaceResult();
  const { selectedPostingId, jobText, rewriteLevel, sectionTitles } = draft;
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendError, setRecommendError] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const addSectionTitle = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || sectionTitles.includes(trimmed)) return;
    setDraft({ sectionTitles: [...sectionTitles, trimmed] });
  };
  const removeSectionTitle = (index: number) => {
    setDraft({ sectionTitles: sectionTitles.filter((_, i) => i !== index) });
  };
  const moveSectionTitle = (index: number, delta: number) => {
    const next = [...sectionTitles];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setDraft({ sectionTitles: next });
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
      kw = analysis.techKeywords.length ? analysis.techKeywords : kw;
    }
    return { jobAnalysis, keywords: kw, jobPostingId: selectedPostingId || undefined };
  };

  const handleRecommend = async () => {
    setRecommendLoading(true);
    setRecommendError('');
    try {
      const { keywords: kw } = await getJobContext();
      const rec = await api.recommendExperiences(kw);
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
      const res = await api.generateAi({ keywords: kw, rewriteLevel, jobAnalysis, jobPostingId, sectionTitles });
      setBundle({ result: res, interview: [], keywords: null });
      if (res.content) {
        try {
          const iq = await api.interviewQuestions(String(res.content));
          const nextInterview = (iq.questions as typeof interview) || [];
          const nextKeywords = await api.compareKeywords(kw, String(res.content));
          setBundle({ result: res, interview: nextInterview, keywords: nextKeywords });
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
  const scores = result?.quality_scores as Record<string, number> | undefined;

  const setupPanel = (
    <div className="space-y-6">
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
      <div className="space-y-2">
        <Label>{t('workspace.jobPlaceholder')}</Label>
        <Textarea
          data-testid="workspace-job-input"
          value={jobText}
          onChange={(e) => setDraft({ jobText: e.target.value })}
          placeholder={selectedPostingId ? t('workspace.jobTextDisabledPlaceholder') : t('workspace.jobPlaceholder')}
          disabled={!!selectedPostingId}
          className="min-h-32 resize-none"
        />
        {selectedPostingId && (
          <p className="text-xs text-muted-foreground">{t('workspace.jobTextDisabledHint')}</p>
        )}
      </div>
      {recommendError && (
        <Alert variant="destructive">
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
    </div>
  );

  const editorPanel = (
    <div className="flex h-full flex-col gap-4">
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

      {wasRestored && jobText && (
        <p className="text-xs text-muted-foreground">{t('workspace.draftRestored')}</p>
      )}
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

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListPlus className="size-4 text-primary" />
            {t('workspace.sectionTitlesLabel')}
          </div>
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
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Wand2 className="size-4 text-primary" />
              {t('workspace.step2Label')}
            </span>
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
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" data-testid="workspace-generate-btn" onClick={handleGenerate} disabled={loading || (!jobText && !selectedPostingId)}>
        {loading ? t('common.generating') : t('workspace.generate')}
      </Button>

      {result?.content ? (
        <Card className="flex-1" data-testid="workspace-result-content">
          <CardContent className="pt-6">
            <WorkspacePanelTitle icon={Sparkles}>{t('workspace.result')}</WorkspacePanelTitle>
            <ScrollArea className="h-[min(60vh,520px)] pr-4">
              {(() => {
                const paragraphs = splitParagraphs(String(result.content));
                if (sectionTitles.length > 0 && sectionTitles.length === paragraphs.length) {
                  return (
                    <div className="space-y-5">
                      {paragraphs.map((p, i) => (
                        <div key={i}>
                          <h4 className="mb-1.5 text-sm font-semibold text-primary">{sectionTitles[i]}</h4>
                          <HighlightedContent
                            content={p}
                            detections={detections.filter((d) => p.includes(d.sentence))}
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
                return <HighlightedContent content={String(result.content)} detections={detections} />;
              })()}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {t('workspace.panelEditor')} — {t('workspace.generate')}
        </div>
      )}
    </div>
  );

  const resultsPanel = (
    <ScrollArea className="h-full max-h-[calc(100svh-7rem)]">
      <div className="space-y-6 pr-3">
        <WorkspacePanelTitle icon={Sparkles}>{t('workspace.panelResults')}</WorkspacePanelTitle>

        {recommended.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('workspace.recommended')}</h3>
            {recommended.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border bg-background p-2 text-sm">
                <span className="truncate pr-2">{r.title}</span>
                <StatusChip label={`${(r.score * 100).toFixed(0)}%`} variant="primary" />
              </div>
            ))}
          </section>
        )}

        {scores && (
          <section className="grid grid-cols-2 gap-2">
            {Object.entries(scores).map(([k, v]) => (
              <Card key={k} size="sm">
                <CardContent className="pt-3 text-center">
                  <p className="text-xs text-muted-foreground truncate">
                    {SCORE_KEY_MAP[k] ? t(SCORE_KEY_MAP[k]) : k}
                  </p>
                  <p className="text-lg font-semibold">{v}</p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {keywords && (
          <section className="space-y-1 text-sm">
            <h3 className="font-medium">{t('workspace.keywordCompare')}</h3>
            <p><span className="text-muted-foreground">{t('workspace.matched')}:</span> {((keywords.matched as string[]) || []).join(', ') || t('common.none')}</p>
            <p className="text-destructive"><span className="text-muted-foreground">{t('workspace.missing')}:</span> {((keywords.missing as string[]) || []).join(', ') || t('common.none')}</p>
          </section>
        )}

        {detections.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('workspace.aiDetection')}</h3>
            {detections.map((d, i) => (
              <div key={i} className="rounded-md border p-2 text-sm">
                <StatusChip label={d.level} variant={LEVEL_VARIANT[d.level] ?? 'default'} className="mb-1" />
                <p>{d.sentence}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.reason}</p>
              </div>
            ))}
          </section>
        )}

        {reviews.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('workspace.review')}</h3>
            {reviews.map((r) => (
              <div key={r.paragraph_index} className="rounded-md border p-3 text-sm space-y-1">
                <p><strong>{t('workspace.strengths')}:</strong> {r.strengths.join(', ')}</p>
                <p><strong>{t('workspace.weaknesses')}:</strong> {r.weaknesses.join(', ')}</p>
                <p className="text-primary">{r.improvement}</p>
              </div>
            ))}
          </section>
        )}

        {interview.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">{t('workspace.interview')}</h3>
            {interview.map((q, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-3">
                <Badge variant="outline" className="mb-1">{q.category}</Badge>
                <p className="text-sm">{q.question}</p>
              </div>
            ))}
          </section>
        )}

        {!result && recommended.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('jobPostings.selectOrUpload')}</p>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-4" data-testid="workspace-page">
      <div className="px-0 xl:hidden">
        <PageHeader title={t('workspace.title')} />
      </div>
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4 text-primary" />
        <AlertDescription className="text-sm">{t('workspace.guide')}</AlertDescription>
      </Alert>
      <WorkspaceLayout left={setupPanel} center={editorPanel} right={resultsPanel} />
    </div>
  );
}
