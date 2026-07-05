import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expression, setExpression] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-forbidden'], queryFn: api.listForbidden });

  const createMutation = useMutation({
    mutationFn: () => api.createForbidden(expression, suggestion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-forbidden'] });
      setExpression('');
      setSuggestion('');
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('forbidden.title')}</h2>
      <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
        className="bg-gray-800 p-4 rounded-xl space-y-3 max-w-lg">
        <input value={expression} onChange={e => setExpression(e.target.value)} placeholder={t('forbidden.expression')}
          className="w-full px-3 py-2 bg-gray-700 rounded" required />
        <input value={suggestion} onChange={e => setSuggestion(e.target.value)} placeholder={t('forbidden.suggestion')}
          className="w-full px-3 py-2 bg-gray-700 rounded" />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{t('common.add')}</button>
      </form>
      {isLoading ? <p>{t('common.loading')}</p> : (
        <ul className="space-y-2">
          {(data as Array<{ id: string; expression: string; suggestion?: string }>).map(f => (
            <li key={f.id} className="bg-gray-800 p-3 rounded flex justify-between">
              <span>{f.expression} {f.suggestion && <span className="text-gray-400">→ {f.suggestion}</span>}</span>
              <button onClick={() => api.deleteForbidden(f.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-forbidden'] }))}
                className="text-red-400 text-sm">{t('common.delete')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
