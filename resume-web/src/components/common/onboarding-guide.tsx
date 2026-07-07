import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Briefcase, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type OnboardingGuideProps = {
  experiencesCount: number;
  jobPostingsCount: number;
  resumesCount: number;
};

export function OnboardingGuide({ experiencesCount, jobPostingsCount, resumesCount }: OnboardingGuideProps) {
  const { t } = useTranslation();

  const steps = [
    {
      key: 'experiences',
      done: experiencesCount > 0,
      icon: BookOpen,
      title: t('onboarding.step1Title'),
      desc: t('onboarding.step1Desc'),
      to: '/experiences',
      cta: t('onboarding.step1Cta'),
    },
    {
      key: 'jobPostings',
      done: jobPostingsCount > 0,
      icon: Briefcase,
      title: t('onboarding.step2Title'),
      desc: t('onboarding.step2Desc'),
      to: '/job-postings',
      cta: t('onboarding.step2Cta'),
    },
    {
      key: 'workspace',
      done: resumesCount > 0,
      icon: Sparkles,
      title: t('onboarding.step3Title'),
      desc: t('onboarding.step3Desc'),
      to: '/workspace',
      cta: t('onboarding.step3Cta'),
    },
  ];

  if (steps.every((s) => s.done)) return null;

  const completed = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="text-lg">{t('onboarding.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.progress', { done: completed, total: steps.length })}
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = !step.done && steps.slice(0, index).every((s) => s.done);
          return (
            <div
              key={step.key}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                step.done && 'border-success/30 bg-success/5',
                isNext && 'border-primary ring-1 ring-primary/20',
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  {step.done ? <Check className="size-4 text-success" /> : <Icon className="size-4 text-primary" />}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {index + 1}/{steps.length}
                </span>
              </div>
              <h3 className="font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              {!step.done && (
                <Button variant={isNext ? 'default' : 'outline'} size="sm" className="mt-3" asChild>
                  <Link to={step.to}>{step.cta}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
