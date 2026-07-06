import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api, type JobPostingResponse } from '@/lib/api';
import { HighlightedContent } from '@/components/HighlightedContent';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  GREEN: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  YELLOW: 'border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  RED: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t('workspace.title')} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.step1')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Textarea value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder={t('workspace.jobPlaceholder')} className="min-h-28" />
          <Button variant="secondary" onClick={handleRecommend}>
            {t('workspace.recommend')}
          </Button>
        </CardContent>
      </Card>

      {recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('workspace.recommended')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommended.map((r) => (
              <div key={r.id} className="flex justify-between rounded-lg bg-muted/50 p-2 text-sm">
                <span>{r.title}</span>
                <Badge variant="secondary">{(r.score * 100).toFixed(0)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.step2', { level: rewriteLevel })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Slider value={[rewriteLevel]} onValueChange={([v]) => setRewriteLevel(v)} min={0} max={100} step={20} />
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading || (!jobText && !selectedPostingId)}>
        {loading ? t('common.generating') : t('workspace.generate')}
      </Button>

      {result && (
        <>
          {scores && (
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(scores).map(([k, v]) => (
                <Card key={k} size="sm">
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-xl font-semibold">{v}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t('workspace.result')}</CardTitle>
            </CardHeader>
            <CardContent>
              <HighlightedContent content={String(result.content)} detections={detections} />
            </CardContent>
          </Card>
          {keywords && (
            <Card>
              <CardHeader>
                <CardTitle>{t('workspace.keywordCompare')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>{t('workspace.matched')}:</strong> {((keywords.matched as string[]) || []).join(', ') || t('common.none')}</p>
                <p className="text-destructive"><strong>{t('workspace.missing')}:</strong> {((keywords.missing as string[]) || []).join(', ') || t('common.none')}</p>
              </CardContent>
            </Card>
          )}
          {detections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('workspace.aiDetection')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {detections.map((d, i) => (
                  <div key={i} className={cn('rounded-lg border p-3', LEVEL_COLORS[d.level] || '')}>
                    <p>{d.sentence}</p>
                    <p className="mt-1 text-xs opacity-80">{d.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('workspace.review')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.paragraph_index} className="rounded-lg border p-4">
                    <p className="text-sm"><strong>{t('workspace.strengths')}:</strong> {r.strengths.join(', ')}</p>
                    <p className="text-sm"><strong>{t('workspace.weaknesses')}:</strong> {r.weaknesses.join(', ')}</p>
                    <p className="text-sm text-primary">{r.improvement}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {interview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('workspace.interview')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {interview.map((q, i) => (
                  <div key={i} className="rounded-lg bg-muted/50 p-3">
                    <Badge variant="outline" className="mb-1">{q.category}</Badge>
                    <p className="text-sm">{q.question}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
