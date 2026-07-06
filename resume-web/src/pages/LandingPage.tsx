import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { getAccessToken } from '@/lib/api';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  const { t } = useTranslation();
  const isLoggedIn = !!getAccessToken();

  const features = [
    { title: t('nav.experiences'), desc: t('experiences.title') },
    { title: t('nav.jobPostings'), desc: t('jobPostings.title') },
    { title: t('nav.workspace'), desc: t('workspace.title') },
  ];

  const pricingTiers = [
    { name: 'Free', price: '₩0', features: [t('nav.experiences'), t('nav.jobPostings'), t('nav.workspace')] },
    { name: 'Pro', price: 'Soon', features: [t('writingStyle.title'), t('nav.settings'), 'API'] },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <section id="intro" className="scroll-mt-20 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-2 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" />
              RAG · AI cover letter
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">{t('app.name')}</h1>
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">{t('app.tagline')}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isLoggedIn ? (
                <Button size="lg" asChild>
                  <Link to="/dashboard">
                    {t('nav.dashboard')}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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
                </>
              )}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('nav.features')}</h2>
            <p className="mt-2 text-muted-foreground">{t('app.tagline')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((item) => (
              <Card key={item.title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-t py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('nav.pricing')}</h2>
            <p className="mt-2 text-muted-foreground">{t('app.tagline')}</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <p className="text-3xl font-semibold tracking-tight">{tier.price}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tier.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 shrink-0 text-primary" />
                      {f}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
