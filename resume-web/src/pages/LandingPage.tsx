import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Briefcase, Check, MessageCircle, PenLine, Sparkles } from 'lucide-react';
import { getAccessToken } from '@/lib/api';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductPreview } from '@/components/landing/product-preview';
import { DocumentHead } from '@/components/seo/document-head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FEATURE_ICONS = [BookOpen, Briefcase, Sparkles] as const;
const FEATURE_ANCHORS = ['library', 'job', 'workspace'] as const;

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

  const testimonials = [
    { quote: t('landing.review1'), name: t('landing.review1Name') },
    { quote: t('landing.review2'), name: t('landing.review2Name') },
    { quote: t('landing.review3'), name: t('landing.review3Name') },
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
            <p className="mt-2 text-sm text-muted-foreground">{t('landing.heroHint')}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isLoggedIn ? (
                <>
                  <Button size="lg" asChild>
                    <Link to="/onboarding">
                      {t('landing.startOnboarding')}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/dashboard">{t('nav.dashboard')}</Link>
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

        <section id="reviews" className="scroll-mt-20 border-t py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('landing.reviewsTitle')}</h2>
            <p className="mt-2 text-muted-foreground">{t('landing.reviewsSubtitle')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <Card key={item.name}>
                <CardHeader>
                  <CardDescription className="text-base text-foreground">&ldquo;{item.quote}&rdquo;</CardDescription>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.name}</CardTitle>
                </CardHeader>
              </Card>
            ))}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <Link
                key={tier.id}
                to={`/pricing#${tier.id}`}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
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

        <section id="community" className="scroll-mt-20 border-t py-12 md:py-16">
          <Card>
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageCircle className="size-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>{t('landing.communityTitle')}</CardTitle>
                <CardDescription>{t('landing.communityDesc')}</CardDescription>
                <Button variant="outline" className="mt-3 w-fit" asChild>
                  <Link to="/contact">{t('landing.communityCta')}</Link>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </section>
      </div>
    </PublicLayout>
  );
}
