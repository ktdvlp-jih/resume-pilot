import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Sparkles, ArrowLeft, ImagePlus, X } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { DocumentHead } from '@/components/seo/document-head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api, getAccessToken } from '@/lib/api';
import { toast } from 'sonner';

type Step = 'input' | 'analysis' | 'generate-input' | 'generation';

interface TrialStatus {
  jobAnalysis: { used: number; max: number };
  generate: { used: number; max: number };
  total: { used: number; max: number };
}

interface AttachedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export default function TrialPage() {
  const { t } = useTranslation();
  const isLoggedIn = !!getAccessToken();
  const signupExtraPoints = t('guestTrial.signupExtraPoints', { returnObjects: true }) as string[];

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const [step, setStep] = useState<Step>('input');
  const [jobInput, setJobInput] = useState('');
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [generationResult, setGenerationResult] = useState<Record<string, unknown> | null>(null);
  const [experienceSummary, setExperienceSummary] = useState('');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getTrialStatus().then(setStatus).catch(() => {});
  }, []);

  const isUrl = (s: string) => /^https?:\/\//.test(s.trim());

  const readFileAsImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 붙여넣을 수 있어요.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImage({
        base64: dataUrl.split(',')[1] ?? '',
        mimeType: file.type,
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          readFileAsImage(file);
        }
        return;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFileAsImage(file);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!jobInput.trim() && !image) return;
    setLoading(true);
    setGenerateError(null);
    try {
      let result: Record<string, unknown>;
      if (image) {
        result = await api.trialJobAnalysis('IMAGE', '', undefined, image.base64, image.mimeType);
      } else if (isUrl(jobInput)) {
        result = await api.trialJobAnalysis('URL', '', jobInput.trim());
      } else {
        result = await api.trialJobAnalysis('TEXT', jobInput);
      }
      setAnalysisResult(result);
      setStep('analysis');
      api.getTrialStatus().then(setStatus).catch(() => {});
    } catch (err: unknown) {
      if (isLimitError(err)) {
        setLimitOpen(true);
      } else {
        toast.error(extractMessage(err) || '분석에 실패했어요. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysisResult) return;
    setLoading(true);
    setGenerateError(null);
    try {
      const rawContent = String(analysisResult.raw_content ?? analysisResult.job_description ?? '');
      const keywords = (analysisResult.tech_keywords as string[] | undefined) ?? [];
      const result = await api.trialGenerate(rawContent, keywords, experienceSummary || undefined);
      setGenerationResult(result);
      setStep('generation');
      api.getTrialStatus().then(setStatus).catch(() => {});
    } catch (err: unknown) {
      if (isLimitError(err)) {
        setLimitOpen(true);
      } else {
        const message = extractMessage(err) || '생성에 실패했어요. 다시 시도해 주세요.';
        setGenerateError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setJobInput('');
    setImage(null);
    setAnalysisResult(null);
    setGenerationResult(null);
    setExperienceSummary('');
    setGenerateError(null);
  };

  const handleRetryWriting = () => {
    setStep('generate-input');
    setGenerationResult(null);
    setGenerateError(null);
  };

  const handleUseExample = () => {
    setExperienceSummary((prev) =>
      prev && prev.trim()
        ? prev
        : t('guestTrial.experienceExample'),
    );
    setGenerateError(null);
  };

  const recruitmentSections = Array.isArray(analysisResult?.recruitment_sections)
    ? (analysisResult.recruitment_sections as Record<string, unknown>[])
    : [];
  const hasRecruitmentSections = recruitmentSections.length > 0;

  const remaining = status
    ? {
        jobRemain: status.jobAnalysis.max - status.jobAnalysis.used,
        genRemain: status.generate.max - status.generate.used,
        totalRemain: status.total.max - status.total.used,
      }
    : null;

  return (
    <PublicLayout>
      <DocumentHead title={t('guestTrial.title')} description={t('guestTrial.subtitle')} path="/trial" />
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-4 gap-2 px-3 py-1">
            <Sparkles className="size-3.5 text-primary" />
            {t('guestTrial.ctaShort')}
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">{t('guestTrial.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('guestTrial.subtitle')}</p>
          {remaining && (
            <p className="mt-3 text-sm text-muted-foreground">
              {t('guestTrial.remaining', remaining)}
            </p>
          )}
        </div>

        {step === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle>{t('guestTrial.analyzeBtn')}</CardTitle>
              <CardDescription>{t('guestTrial.jobInputLabel')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StepGuide title={t('guestTrial.step1GuideTitle')} body={t('guestTrial.step1GuideBody')} />
              <Textarea
                value={jobInput}
                onChange={(e) => setJobInput(e.target.value)}
                onPaste={handlePaste}
                placeholder={t('guestTrial.jobInputPlaceholder')}
                rows={6}
              />
              {image ? (
                <div className="relative rounded-lg border bg-muted/50 p-2">
                  <img
                    src={image.previewUrl}
                    alt="첨부 이미지"
                    className="max-h-56 w-full rounded object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-3 size-8 rounded-full bg-background/80"
                    onClick={() => setImage(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  {t('guestTrial.attachImage')}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                onClick={handleAnalyze}
                disabled={loading || (!jobInput.trim() && !image)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('guestTrial.analyzing')}
                  </>
                ) : (
                  t('guestTrial.analyzeBtn')
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'analysis' && analysisResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('guestTrial.analysisResult')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <StepGuide title={t('guestTrial.step2GuideTitle')} body={t('guestTrial.step2GuideBody')} />
                <div className="flex flex-wrap gap-x-10 gap-y-3">
                  <FieldRow label={t('jobPostings.company')} value={analysisResult.company_name} />
                  <FieldRow label={t('jobPostings.position')} value={analysisResult.position} />
                </div>

                {analysisResult.job_description ? (
                  <ListSection title={t('jobPostings.summary')}>
                    <p className="whitespace-pre-wrap text-pretty">{String(analysisResult.job_description)}</p>
                  </ListSection>
                ) : null}

                {hasRecruitmentSections ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">{t('jobPostings.recruitmentSections')}</p>
                    <div className="space-y-3">
                      {recruitmentSections.map((section, index) => (
                        <div key={`${String(section.title ?? 'section')}-${index}`} className="space-y-3 rounded-lg border p-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-semibold">{String(section.title ?? '—')}</p>
                            {section.headcount ? (
                              <p className="text-xs text-muted-foreground">
                                {t('jobPostings.headcount')}: {String(section.headcount)}
                              </p>
                            ) : null}
                          </div>
                          <ListSection title={t('jobPostings.jobResponsibilities')} value={section.job_responsibilities} />
                          <ListSection title={t('jobPostings.qualifications')} value={section.qualifications} />
                          <ListSection title={t('jobPostings.requiredSkills')} value={section.required_skills} />
                          <ListSection title={t('jobPostings.preferredSkills')} value={section.preferred_skills} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <ListSection title={t('jobPostings.jobResponsibilities')} value={analysisResult.job_responsibilities} />
                    <ListSection title={t('jobPostings.qualifications')} value={analysisResult.qualifications} />
                    <ListSection title={t('jobPostings.requiredSkills')} value={analysisResult.required_skills} />
                    <ListSection title={t('jobPostings.preferredSkills')} value={analysisResult.preferred_skills} />
                  </>
                )}
                <ListSection title={t('jobPostings.workConditions')} value={analysisResult.work_conditions} />
                <ListSection title={t('jobPostings.benefits')} value={analysisResult.benefits} />
                <ListSection title={t('jobPostings.hiringProcess')} value={analysisResult.hiring_process} />
                <ListSection title={t('jobPostings.notes')} value={analysisResult.notes} />
                <ListSection title={t('jobPostings.techKeywords')} value={analysisResult.tech_keywords} inline />
                <ListSection title={t('jobPostings.solutionKeywords')} value={analysisResult.solution_keywords} inline />
                <ListSection title={t('jobPostings.talentProfile')} value={analysisResult.talent_profile} />
                <ListSection title={t('jobPostings.coreCompetencies')} value={analysisResult.core_competencies} />
                <ListSection title={t('jobPostings.orgCulture')} value={analysisResult.org_culture} />
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                <ArrowLeft className="size-4" />
                {t('guestTrial.tryAnother')}
              </Button>
              <Button className="flex-1" onClick={() => setStep('generate-input')}>
                {t('guestTrial.generateBtn')}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'generate-input' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('guestTrial.generateBtn')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StepGuide title={t('guestTrial.step3GuideTitle')} body={t('guestTrial.step3GuideBody')} />
                <div>
                  <Label>{t('guestTrial.experienceLabel')}</Label>
                  <Textarea
                    value={experienceSummary}
                    onChange={(e) => setExperienceSummary(e.target.value)}
                    placeholder={t('guestTrial.experiencePlaceholder')}
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleUseExample}>
                    {t('guestTrial.useExample')}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t('guestTrial.exampleHint')}</p>
                </div>
                {generateError ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <p className="font-medium text-amber-300">{t('guestTrial.generateFailedTitle')}</p>
                    <p className="mt-1 text-amber-100">{generateError}</p>
                    <p className="mt-2 text-amber-100/90">{t('guestTrial.generateFailedHelp')}</p>
                  </div>
                ) : null}
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t('guestTrial.generating')}
                    </>
                  ) : (
                    <>
                      {t('guestTrial.generateBtn')}
                      <Sparkles className="size-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            <Button variant="ghost" onClick={() => setStep('analysis')}>
              <ArrowLeft className="size-4" />
              {t('guestTrial.analysisResult')}
            </Button>
          </div>
        )}

        {step === 'generation' && generationResult && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('guestTrial.generationResult')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  {String(generationResult.content ?? '')}
                </div>
              </CardContent>
            </Card>
            <div className="text-center">
              <StepGuide title={t('guestTrial.step4GuideTitle')} body={t('guestTrial.step4GuideBody')} />
              <p className="mt-4 text-sm font-medium">{t('guestTrial.saveNeedSignup')}</p>
              {!isLoggedIn && (
                <div className="mt-3 text-left">
                  <p className="text-xs font-semibold text-primary/90">{t('guestTrial.signupExtraTitle')}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-primary/90">
                    {signupExtraPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {!isLoggedIn && (
                  <Button asChild>
                    <Link to="/signup">
                      {t('auth.signup')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="outline" onClick={handleRetryWriting}>
                  {t('guestTrial.retryWriting')}
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  {t('guestTrial.tryAnother')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <LimitDialog open={limitOpen} onOpenChange={setLimitOpen} isLoggedIn={isLoggedIn} />
      </div>
    </PublicLayout>
  );
}

function LimitDialog({
  open,
  onOpenChange,
  isLoggedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isLoggedIn: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('guestTrial.limitTitle')}</DialogTitle>
          <DialogDescription>{t('guestTrial.limitDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('guestTrial.backToLanding')}
          </Button>
          {!isLoggedIn && (
            <Button asChild>
              <Link to="/signup">
                {t('guestTrial.limitSignup')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  const display = Array.isArray(value) ? (value as string[]).join(', ') : String(value);
  if (!display) return null;
  return (
    <div>
      <span className="font-medium text-muted-foreground">{label}</span>
      <p className="mt-0.5 font-semibold">{display}</p>
    </div>
  );
}

function StepGuide({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function ListSection({
  title,
  value,
  inline,
  children,
}: {
  title: string;
  value?: unknown;
  inline?: boolean;
  children?: React.ReactNode;
}) {
  if (children) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-semibold">{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    );
  }
  if (value == null) return null;
  const items = Array.isArray(value) ? value.filter((v) => v != null && String(v).trim()) : [String(value)];
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{title}</p>
      {inline ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="font-normal">
              {String(item)}
            </Badge>
          ))}
        </div>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {items.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isLimitError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code?: string }).code === 'GUEST_TRIAL_LIMIT_EXCEEDED';
  }
  if (err instanceof Error && err.message.includes('423')) return true;
  return false;
}

function extractMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as { message: string }).message;
  }
  return null;
}
