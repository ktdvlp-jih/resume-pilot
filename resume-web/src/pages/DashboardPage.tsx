import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { CareerPortfolioOverview } from '../components/career/CareerPortfolioOverview';
import { normalizeCareerPortfolio } from '../lib/career-portfolio';

export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ['resumes'], queryFn: api.listResumes });

  const deleteMutation = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] }),
  });

  const portfolio = normalizeCareerPortfolio(user?.careerPortfolio);

  return (
    <div className="max-w-6xl mx-auto">
      <CareerPortfolioOverview name={user?.name} portfolio={portfolio} />

      <div className="flex justify-between items-center mb-6 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
        <h2 className="text-xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        <Link
          to="/workspace"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90"
        >
          {t('dashboard.newResume')}
        </Link>
      </div>

      {isLoading ? (
        <p className="text-zinc-500">{t('common.loading')}</p>
      ) : resumes.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500">
          <p>{t('dashboard.empty')}</p>
          <Link to="/workspace" className="text-violet-600 mt-2 inline-block text-sm">{t('dashboard.startWorkspace')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-5 hover:shadow-md transition"
            >
              <h3 className="font-semibold">{r.title}</h3>
              {r.companyName && <p className="text-violet-600 dark:text-violet-400 text-sm mt-1">{r.companyName}</p>}
              <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{r.latestContent || r.description || t('dashboard.noContent')}</p>
              <div className="flex gap-3 mt-4 text-sm">
                <Link to={`/resumes/${r.id}/versions`} className="text-violet-600">{t('dashboard.versions')}</Link>
                <button onClick={() => deleteMutation.mutate(r.id)} className="text-red-500">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
