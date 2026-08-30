import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Briefcase, Check, PenLine, Sparkles } from 'lucide-react';
import { getAccessToken } from '@/lib/api';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductPreview } from '@/components/landing/product-preview';
import { DocumentHead } from '@/components/seo/document-head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURE_ICONS = [BookOpen, Briefcase, Sparkles] as const;
const FEATURE_ANCHORS = ['library', 'job', 'workspace'] as const;
const PRICING_ANCHORS = ['free', 'pro'] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  const isLoggedIn = !!getAccessToken();

  const features = [
    { title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
  ];

  const pricingTiers = [
    {
      name: t('landing.tierFree'),
      price: '₩0',
      features: [t('nav.experiences'), t('nav.jobPostings'), t('nav.workspace'), t('writingStyle.title')],
    },
    {
      name: t('landing.tierPro'),
      price: t('landing.comingSoon'),
      features: [t('landing.proConnect'), t('landing.proSchedule')],
    },
  ];

  return (
    <PublicLayout>
      <DocumentHead title={t('app.name')} description={t('landing.heroSubtitle')} path="/" />
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <section id="intro" className="scroll-mt-20 py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-2 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" />
              {t('landing.badge')}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">{t('app.name')}</h1>
            <p className="mt-4 text-lg text-pretty text-muted-foreground md:text-xl">{t('landing.heroSubtitle')}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isLoggedIn ? (
                <>
                  <Button size="lg" asChild>
                    <Link to="/dashboard">
                      {t('nav.dashboard')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/guides">{t('nav.guides')}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link to="/signup">
                      {t('auth.signup')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/login">{t('auth.login')}</Link>
                  </Button>
                  <Button size="lg" variant="ghost" asChild>
                    <Link to="/guides">{t('nav.guides')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <ProductPreview />
        </section>

        <section id="features" className="scroll-mt-20 border-t py-16 md:py-20">
          <div className="mb-10 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('nav.features')}</h2>
            <p className="text-muted-foreground">{t('landing.featuresSubtitle')}</p>
            <Button variant="link" asChild>
              <Link to="/features">
                {t('landing.viewFeatures')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item, i) => {
              const Icon = FEATURE_ICONS[i] ?? PenLine;
              const to = `/features#${FEATURE_ANCHORS[i]}`;
              return (
                <Link
                  key={item.title}
                  to={to}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
                    <CardHeader>
                      <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>{item.desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="inline-flex items-center gap-1 text-sm text-primary">
                        {t('landing.viewMore')}
                        <ArrowRight className="size-4" aria-hidden />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-t py-16 md:py-20">
          <div className="mb-10 flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('nav.pricing')}</h2>
            <p className="text-muted-foreground">{t('landing.pricingSubtitle')}</p>
            <Button variant="link" asChild>
              <Link to="/pricing">
                {t('landing.viewPricing')}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            {pricingTiers.map((tier, i) => (
              <Link
                key={tier.name}
                to={`/pricing#${PRICING_ANCHORS[i]}`}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle>{tier.name}</CardTitle>
                    <p className="text-3xl font-semibold tracking-tight">{tier.price}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {tier.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="size-4 shrink-0 text-primary" aria-hidden />
                        {f}
                      </div>
                    ))}
                    <span className="mt-2 inline-flex items-center gap-1 text-sm text-primary">
                      {t('landing.viewMore')}
                      <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
