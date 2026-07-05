import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ['resumes'], queryFn: api.listResumes });

  const deleteMutation = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resumes'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('dashboard.title')}</h2>
        <Link to="/workspace" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          {t('dashboard.newResume')}
        </Link>
      </div>
      {isLoading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>{t('dashboard.empty')}</p>
          <Link to="/workspace" className="text-blue-600 mt-2 inline-block">{t('dashboard.startWorkspace')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <div key={r.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-lg">{r.title}</h3>
              {r.companyName && <p className="text-blue-600 text-sm mt-1">{r.companyName}</p>}
              <p className="text-gray-500 text-sm mt-2 line-clamp-2">{r.latestContent || r.description || t('dashboard.noContent')}</p>
              <div className="flex gap-2 mt-4">
                <Link to={`/resumes/${r.id}/versions`} className="text-sm text-blue-600">{t('dashboard.versions')}</Link>
                <button onClick={() => deleteMutation.mutate(r.id)} className="text-sm text-red-500">{t('common.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
