import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { useScrollToHash } from '@/hooks/use-scroll-to-hash';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, getAccessToken } from '@/lib/api';

export default function PricingPage() {
  const { t } = useTranslation();
  useScrollToHash();
  const loggedIn = !!getAccessToken();
  const buyTo = loggedIn ? '/settings?tab=billing' : '/login';
  const ctaLabel = loggedIn ? t('pricingPage.buyCta') : t('pricingPage.cta');

  const productsQuery = useQuery({
    queryKey: ['billing-products'],
    queryFn: api.listBillingProducts,
  });
  const products = productsQuery.data ?? [];
  const faqs = t('pricingPage.faq', { returnObjects: true });
  const faqList = Array.isArray(faqs) ? (faqs as { q: string; a: string }[]) : [];

  const tiers = [
    {
      id: 'free',
      name: t('landing.tierFree'),
      price: '₩0',
      features: [t('landing.freeF1'), t('landing.freeF2'), t('landing.freeF3')],
    },
    {
      id: 'starter',
      name: t('landing.tierStarter'),
      price: t('landing.tierStarterPrice'),
      features: [t('landing.starterF1'), t('landing.starterF2')],
    },
    {
      id: 'standard',
      name: t('landing.tierStandard'),
      price: t('landing.tierStandardPrice'),
      features: [t('landing.standardF1'), t('landing.standardF2')],
    },
    {
      id: 'power',
      name: t('landing.tierPower'),
      price: t('landing.tierPowerPrice'),
      features: [t('landing.powerF1'), t('landing.powerF2')],
    },
  ];

  return (
    <PublicPage title={t('pricingPage.title')} description={t('pricingPage.pageDesc')} path="/pricing" width="lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('pricingPage.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('pricingPage.pageDesc')}</p>
        <p className="text-sm text-muted-foreground">{t('pricingPage.nowNote')}</p>
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('pricingPage.tiersTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('pricingPage.tiersDesc')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <Card key={tier.id} id={tier.id} className="scroll-mt-20">
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <p className="text-2xl font-semibold tracking-tight">{tier.price}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {tier.features.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{t('pricingPage.productsTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} id={`product-${p.id}`} className="scroll-mt-20">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{p.name}</CardTitle>
                  <Badge variant="secondary">{p.kind}</Badge>
                </div>
                <p className="text-3xl font-semibold tracking-tight">
                  {p.priceKrw.toLocaleString()}원
                </p>
                <CardDescription>
                  {p.kind === 'TOKEN'
                    ? t('billing.productToken', { amount: p.grantAmount })
                    : t('billing.productCount', { amount: p.grantAmount, operation: p.operation })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{t('pricingPage.productPoint')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {products.length === 0 && !productsQuery.isLoading && (
            <p className="text-sm text-muted-foreground md:col-span-2">{t('pricingPage.empty')}</p>
          )}
        </div>
      </section>

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
        <Link to={buyTo}>
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </PublicPage>
  );
}
