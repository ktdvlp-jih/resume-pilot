import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function CompaniesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [culture, setCulture] = useState('');
  const [keywords, setKeywords] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-companies'], queryFn: api.listCompanies });

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.updateCompany(id, {
      culture,
      hiringKeywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditId(null);
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('companies.title')}</h2>
      {isLoading ? <p>{t('common.loading')}</p> : (
        <table className="w-full text-sm bg-gray-800 rounded-xl">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="p-3">{t('companies.name')}</th>
              <th className="p-3">{t('companies.culture')}</th>
              <th className="p-3">{t('companies.hiringKeywords')}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data as Array<{ id: string; name: string; culture?: string; hiringKeywords: string[] }>).map(c => (
              <tr key={c.id} className="border-b border-gray-700">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-gray-400">{c.culture || '-'}</td>
                <td className="p-3 text-gray-400">{c.hiringKeywords?.join(', ') || '-'}</td>
                <td className="p-3">
                  <button onClick={() => { setEditId(c.id); setCulture(c.culture || ''); setKeywords((c.hiringKeywords || []).join(', ')); }}
                    className="text-blue-400 text-xs">{t('common.edit')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editId && (
        <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(editId); }}
          className="bg-gray-800 p-4 rounded-xl space-y-3 max-w-lg">
          <h3 className="font-semibold">{t('companies.editCompany')}</h3>
          <input value={culture} onChange={e => setCulture(e.target.value)} placeholder={t('companies.orgCulture')}
            className="w-full px-3 py-2 bg-gray-700 rounded" />
          <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder={t('companies.keywordsPlaceholder')}
            className="w-full px-3 py-2 bg-gray-700 rounded" />
          <button type="submit" className="px-4 py-2 bg-blue-600 rounded">{t('common.save')}</button>
        </form>
      )}
    </div>
  );
}
