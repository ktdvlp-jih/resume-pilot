import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Rocket, X } from 'lucide-react';
import { markOnboardingFlowDone, useOnboardingFlowPending } from '@/lib/onboarding-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function QuickStartBanner() {
  const { t } = useTranslation();
  const pending = useOnboardingFlowPending();

  if (!pending) return null;

  const dismiss = () => {
    markOnboardingFlowDone();
  };

  return (
    <Card className="relative border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-3 top-3 text-muted-foreground"
        onClick={dismiss}
        aria-label={t('onboardingFlow.bannerDismiss')}
      >
        <X className="size-4" />
      </Button>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3 pr-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Rocket className="size-5" aria-hidden />
          </div>
          <div>
            <p className="font-medium">{t('onboardingFlow.bannerTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboardingFlow.bannerDesc')}</p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/onboarding">
            {t('onboardingFlow.bannerCta')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
