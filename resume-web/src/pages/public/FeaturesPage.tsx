import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { PublicPage } from '@/components/layout/public-page';
import { useScrollToHash } from '@/hooks/use-scroll-to-hash';
import { Button } from '@/components/ui/button';
import { getAccessToken } from '@/lib/api';

const SECTIONS = [
  { id: 'library', relatedTo: '/guides/star' },
  { id: 'job', relatedTo: '/guides/job-posting' },
  { id: 'workspace', relatedTo: '/signup' },
  { id: 'style', relatedTo: undefined },
  { id: 'calendar', relatedTo: '/calendar' },
  { id: 'tools', relatedTo: '/guides' },
] as const;

export default function FeaturesPage() {
  const { t } = useTranslation();
  useScrollToHash();
  const loggedIn = !!getAccessToken();
  const startTo = loggedIn ? '/workspace' : '/signup';
  const ctaLabel = loggedIn ? t('nav.workspace') : t('featuresPage.cta');

  return (
    <PublicPage title={t('featuresPage.title')} description={t('featuresPage.pageDesc')} path="/features" width="lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('featuresPage.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('featuresPage.pageDesc')}</p>
      </header>
      <div className="flex flex-col gap-12">
        {SECTIONS.map((section) => {
          const points = t(`featuresPage.sections.${section.id}.points`, { returnObjects: true });
          const list = Array.isArray(points) ? points.map(String) : [];
          return (
            <section key={section.id} id={section.id} className="scroll-mt-20 flex flex-col gap-3 border-t pt-10 first:border-t-0 first:pt-0">
              <h2 className="text-xl font-semibold tracking-tight">{t(`featuresPage.sections.${section.id}.title`)}</h2>
              <p className="text-pretty text-muted-foreground">{t(`featuresPage.sections.${section.id}.lead`)}</p>
              <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                {list.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              {section.relatedTo ? (
                <Button variant="outline" size="sm" className="w-fit" asChild>
                  <Link to={section.relatedTo === '/signup' ? startTo : section.relatedTo}>
                    {section.relatedTo === '/signup' ? ctaLabel : t('featuresPage.openRelated')}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              ) : null}
            </section>
          );
        })}
      </div>
      <Button asChild>
        <Link to={startTo}>
          {ctaLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </PublicPage>
  );
}
