import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Briefcase, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { OnboardingExperienceStep } from '@/components/onboarding/onboarding-experience-step';
import { PageHeader } from '@/components/common/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { markOnboardingFlowDone } from '@/lib/onboarding-flow';
import {
  clearOnboardingSession,
  loadOnboardingExperienceIds,
  loadOnboardingJobId,
  saveOnboardingExperienceIds,
  saveOnboardingJobId,
} from '@/lib/onboarding-session';

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState<string | null>(() => loadOnboardingJobId());
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>(() =>
    loadOnboardingExperienceIds(),
  );

  useEffect(() => {
    if (jobId) saveOnboardingJobId(jobId);
  }, [jobId]);

  useEffect(() => {
    saveOnboardingExperienceIds(selectedExperienceIds);
  }, [selectedExperienceIds]);

  const workspacePath = () => {
    const params = new URLSearchParams();
    if (jobId) params.set('postingId', jobId);
    if (selectedExperienceIds.length > 0) {
      params.set('experienceIds', selectedExperienceIds.join(','));
    }
    const qs = params.toString();
    return qs ? `/workspace?${qs}` : '/workspace';
  };

  const finish = (to: string) => {
    markOnboardingFlowDone();
    clearOnboardingSession();
    navigate(to);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t('onboardingFlow.urlRequired'));
      return;
    }
    setLoading(true);
    try {
      const posting = await api.uploadJobPosting({ sourceType: 'URL', sourceUrl: trimmed });
      setJobId(posting.id);
      toast.success(t('onboardingFlow.analyzeOk'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboardingFlow.analyzeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const importHref = `/experiences/import?return=${encodeURIComponent('/onboarding')}`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <PageHeader title={t('onboardingFlow.title')} description={t('onboardingFlow.subtitle')} />

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-5" aria-hidden />
          </div>
          <CardTitle>{t('onboardingFlow.step1Title')}</CardTitle>
          <CardDescription>{t('onboardingFlow.step1Desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="job-url">{t('onboardingFlow.urlLabel')}</Label>
              <Input
                id="job-url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading || !!jobId}
              />
            </div>
            {!jobId ? (
              <Button type="submit" disabled={loading}>
                {loading ? t('common.loading') : t('onboardingFlow.analyzeCta')}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t('onboardingFlow.analyzeDone')}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-5" aria-hidden />
          </div>
          <CardTitle>{t('onboardingFlow.step2Title')}</CardTitle>
          <CardDescription>{t('onboardingFlow.step2Desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OnboardingExperienceStep
            selectedIds={selectedExperienceIds}
            onSelectedIdsChange={setSelectedExperienceIds}
          />
          <Button variant="outline" asChild>
            <Link to={importHref}>{t('onboardingFlow.importCta')}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <CardTitle>{t('onboardingFlow.step3Title')}</CardTitle>
          <CardDescription>{t('onboardingFlow.step3Desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => finish(workspacePath())} disabled={!jobId}>
            {t('onboardingFlow.workspaceCta')}
            <ArrowRight className="size-4" />
          </Button>
          <Button variant="ghost" onClick={() => finish('/dashboard')}>
            {t('onboardingFlow.skip')}
          </Button>
          {!jobId ? (
            <p className="w-full text-sm text-muted-foreground">{t('onboardingFlow.workspaceNeedJob')}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
