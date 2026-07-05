import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CareerPortfolio } from '../../lib/career-portfolio';
import { portfolioCompletion } from '../../lib/career-portfolio';

interface Props {
  name?: string;
  portfolio: CareerPortfolio;
}

const bento =
  'rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md p-5 shadow-sm hover:shadow-md transition-shadow';

export function CareerPortfolioOverview({ name, portfolio }: Props) {
  const { t } = useTranslation();
  const pct = portfolioCompletion(portfolio);
  const cl = portfolio.coverLetter;

  return (
    <div className="space-y-6 mb-10">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/50 dark:border-zinc-800 bg-gradient-to-br from-violet-600/90 via-indigo-600/85 to-blue-700/80 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">{t('portfolio.overviewLabel')}</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {name || t('portfolio.defaultName')}
            </h2>
            <p className="text-violet-100/90 mt-2 text-sm max-w-xl">{t('portfolio.overviewSubtitle')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{pct}%</div>
              <div className="text-xs text-violet-200">{t('portfolio.completion')}</div>
            </div>
            <Link
              to="/settings"
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-medium backdrop-blur"
            >
              {t('portfolio.edit')}
            </Link>
          </div>
        </div>
        <div className="relative mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className={`${bento} lg:col-span-1`}>
          <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-3">{t('portfolio.careers')}</h3>
          {portfolio.careers.length === 0 ? (
            <EmptyHint text={t('portfolio.emptyCareers')} />
          ) : (
            <ul className="space-y-3">
              {portfolio.careers.slice(0, 3).map((c, i) => (
                <li key={i} className="border-l-2 border-violet-500/50 pl-3">
                  <p className="font-medium text-sm">{c.company || '—'}</p>
                  <p className="text-xs text-zinc-500">{c.position}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{c.startDate} — {c.endDate || t('portfolio.present')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={bento}>
          <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-3">{t('portfolio.educations')}</h3>
          {portfolio.educations.length === 0 ? (
            <EmptyHint text={t('portfolio.emptyEducations')} />
          ) : (
            <ul className="space-y-2">
              {portfolio.educations.map((e, i) => (
                <li key={i}>
                  <p className="font-medium text-sm">{e.school}</p>
                  <p className="text-xs text-zinc-500">{e.major} · {e.degree}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={bento}>
          <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-3">{t('portfolio.skills')}</h3>
          {portfolio.skills.length === 0 ? (
            <EmptyHint text={t('portfolio.emptySkills')} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {portfolio.skills.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={`${bento} md:col-span-2 lg:col-span-3`}>
          <h3 className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">{t('portfolio.careerStatement')}</h3>
          {portfolio.careerStatement?.trim() ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-6">
              {portfolio.careerStatement}
            </p>
          ) : (
            <EmptyHint text={t('portfolio.emptyStatement')} />
          )}
        </div>
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
  return <p className="text-sm text-zinc-400 italic">{text}</p>;
}

function CoverCard({ title, text, className = '' }: { title: string; text?: string; className?: string }) {
  return (
    <div className={`${bento} ${className}`}>
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">{title}</h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-4 whitespace-pre-wrap">
        {text?.trim() || '—'}
      </p>
    </div>
  );
}
