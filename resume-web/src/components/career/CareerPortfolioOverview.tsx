import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CareerPortfolio } from '@/lib/career-portfolio';
import { portfolioCompletion } from '@/lib/career-portfolio';
import { brandSurfaceClass, brandSurfaceMutedClass } from '@/lib/brand-surface';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props {
  name?: string;
  portfolio: CareerPortfolio;
}

export function CareerPortfolioOverview({ name, portfolio }: Props) {
  const { t } = useTranslation();
  const pct = portfolioCompletion(portfolio);
  const cl = portfolio.coverLetter;

  return (
    <div className="mb-10 space-y-6">
      <Card className={cn('overflow-hidden border-primary/20 bg-gradient-to-br from-primary via-primary/90 to-primary/70', brandSurfaceClass)}>
        <CardContent className="relative pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={cn('text-sm', brandSurfaceMutedClass)}>{t('portfolio.overviewLabel')}</p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {name || t('portfolio.defaultName')}
              </h2>
              <p className={cn('mt-2 max-w-xl text-sm', brandSurfaceMutedClass)}>{t('portfolio.overviewSubtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{pct}%</div>
                <div className={cn('text-xs', brandSurfaceMutedClass)}>{t('portfolio.completion')}</div>
              </div>
              <Button variant="secondary" asChild>
                <Link to="/settings">{t('portfolio.edit')}</Link>
              </Button>
            </div>
          </div>
          <Progress value={pct} className="mt-4 h-1.5 bg-white/20 [&>div]:bg-white" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-primary text-sm">{t('portfolio.careers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.careers.length === 0 ? (
              <EmptyHint text={t('portfolio.emptyCareers')} />
            ) : (
              <ul className="space-y-3">
                {portfolio.careers.slice(0, 3).map((c, i) => (
                  <li key={i} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm font-medium">{c.company || '—'}</p>
                    <p className="text-xs text-muted-foreground">{c.position}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.startDate} — {c.endDate || t('portfolio.present')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-primary text-sm">{t('portfolio.educations')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.educations.length === 0 ? (
              <EmptyHint text={t('portfolio.emptyEducations')} />
            ) : (
              <ul className="space-y-2">
                {portfolio.educations.map((e, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium">{e.school}</p>
                    <p className="text-xs text-muted-foreground">{e.major} · {e.degree}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-primary text-sm">{t('portfolio.skills')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.skills.length === 0 ? (
              <EmptyHint text={t('portfolio.emptySkills')} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {portfolio.skills.map((s, i) => (
                  <Badge key={i} variant="secondary">{s.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3" size="sm">
          <CardHeader>
            <CardTitle className="text-primary text-sm">{t('portfolio.careerStatement')}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolio.careerStatement?.trim() ? (
              <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {portfolio.careerStatement}
              </p>
            ) : (
              <EmptyHint text={t('portfolio.emptyStatement')} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CoverCard title={`5-1 · ${t('portfolio.section51')}`} text={cl.jobExperience} />
        <CoverCard title={`5-2 · ${t('portfolio.section52')}`} text={cl.collaboration} />
        <CoverCard title={`5-3 · ${t('portfolio.section53')}`} text={cl.growthValues} />
        <CoverCard title={`5-4 · ${t('portfolio.section54')}`} text={cl.personality} />
        <CoverCard title={`5-5 · ${t('portfolio.section55')}`} text={cl.motivation} className="md:col-span-2" />
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm italic text-muted-foreground">{text}</p>;
}

function CoverCard({ title, text, className = '' }: { title: string; text?: string; className?: string }) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="text-xs text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{text?.trim() || '—'}</p>
      </CardContent>
    </Card>
  );
}
