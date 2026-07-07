import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Sparkles, Wand2 } from 'lucide-react';
import { api, type JobPostingResponse } from '@/lib/api';
import { HighlightedContent } from '@/components/HighlightedContent';
import { PageHeader } from '@/components/common/page-header';
import { WorkspaceLayout, WorkspacePanelTitle } from '@/components/workspace/workspace-layout';
import { StatusChip } from '@/components/common/status-chip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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

const LEVEL_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'destructive',
};

export default function WorkspacePage() {
  const { t } = useTranslation();
  const [selectedPostingId, setSelectedPostingId] = useState('');
  const [jobText, setJobText] = useState('');
  const [rewriteLevel, setRewriteLevel] = useState(40);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [recommended, setRecommended] = useState<Array<{ id: string; title: string; score: number }>>([]);
  const [interview, setInterview] = useState<Array<{ category: string; question: string }>>([]);
  const [keywords, setKeywords] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const { keywords: kw } = await getJobContext();
    const rec = await api.recommendExperiences(kw);
    setRecommended(rec.map((r) => ({ id: r.id, title: r.title, score: r.score })));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { jobAnalysis, keywords: kw, jobPostingId } = await getJobContext();
      const res = await api.generateAi({ keywords: kw, rewriteLevel, jobAnalysis, jobPostingId });
      setResult(res);
      if (res.content) {
        const iq = await api.interviewQuestions(String(res.content));
        setInterview((iq.questions as typeof interview) || []);
        const kc = await api.compareKeywords(kw, String(res.content));
        setKeywords(kc);
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
      {postings.length > 0 && (
        <div className="space-y-2">
          <Label>{t('jobPostings.saved')}</Label>
          <Select value={selectedPostingId || '__none__'} onValueChange={(v) => setSelectedPostingId(v === '__none__' ? '' : v)}>
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
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder={t('workspace.jobPlaceholder')}
          className="min-h-32 resize-none"
        />
      </div>
      <Button variant="secondary" className="w-full" onClick={handleRecommend}>
        {t('workspace.recommend')}
      </Button>

      <div className="space-y-3 border-t pt-6">
        <WorkspacePanelTitle icon={Wand2}>{t('workspace.step2', { level: rewriteLevel })}</WorkspacePanelTitle>
        <Slider value={[rewriteLevel]} onValueChange={([v]) => setRewriteLevel(v)} min={0} max={100} step={20} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>{rewriteLevel}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );

  const editorPanel = (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title={t('workspace.title')} className="mb-0" />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('common.generating')}</p>
          <Progress className="animate-pulse" value={66} />
        </div>
      )}

      <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading || (!jobText && !selectedPostingId)}>
        {loading ? t('common.generating') : t('workspace.generate')}
      </Button>

      {result?.content ? (
        <Card className="flex-1">
          <CardContent className="pt-6">
            <WorkspacePanelTitle icon={Sparkles}>{t('workspace.result')}</WorkspacePanelTitle>
            <ScrollArea className="max-h-[min(60vh,520px)] pr-4">
              <HighlightedContent content={String(result.content)} detections={detections} />
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
                  <p className="text-xs text-muted-foreground truncate">{k}</p>
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
    <div className="space-y-4">
      <div className="px-0 xl:hidden">
        <PageHeader title={t('workspace.title')} />
      </div>
      <WorkspaceLayout left={setupPanel} center={editorPanel} right={resultsPanel} />
    </div>
  );
}
