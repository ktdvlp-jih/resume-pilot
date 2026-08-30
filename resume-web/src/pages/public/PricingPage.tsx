import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { useScrollToHash } from '@/hooks/use-scroll-to-hash';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAccessToken } from '@/lib/api';

const TIERS = ['free', 'pro'] as const;

export default function PricingPage() {
  const { t } = useTranslation();
  useScrollToHash();
  const loggedIn = !!getAccessToken();
  const startTo = loggedIn ? '/dashboard' : '/signup';
  const ctaLabel = loggedIn ? t('nav.dashboard') : t('pricingPage.cta');
  const faqs = t('pricingPage.faq', { returnObjects: true });
  const faqList = Array.isArray(faqs) ? (faqs as { q: string; a: string }[]) : [];

  return (
    <PublicPage title={t('pricingPage.title')} description={t('pricingPage.pageDesc')} path="/pricing" width="lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('pricingPage.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('pricingPage.pageDesc')}</p>
        <p className="text-sm text-muted-foreground">{t('pricingPage.nowNote')}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {TIERS.map((tier) => {
          const points = t(`pricingPage.${tier}.points`, { returnObjects: true });
          const list = Array.isArray(points) ? points.map(String) : [];
          return (
            <Card key={tier} id={tier} className="scroll-mt-20">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{t(`pricingPage.${tier}.name`)}</CardTitle>
                  <Badge variant="secondary">{t(`pricingPage.${tier}.tag`)}</Badge>
                </div>
                <p className="text-3xl font-semibold tracking-tight">{t(`pricingPage.${tier}.price`)}</p>
                <CardDescription>{t(`pricingPage.${tier}.lead`)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {list.map((point) => (
                  <div key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{point}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{t('pricingPage.faqTitle')}</h2>
        <dl className="flex flex-col gap-4">
          {faqList.map((item) => (
            <div key={item.q} className="flex flex-col gap-1">
              <dt className="font-medium">{item.q}</dt>
              <dd className="text-sm text-pretty text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Button asChild>
        <Link to={startTo}>
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </PublicPage>
  );
}
