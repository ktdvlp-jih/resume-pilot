import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.listUsers });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('users.title')}</h2>
      {isLoading ? <p>{t('common.loading')}</p> : (
        <table className="w-full text-sm bg-gray-800 rounded-xl">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="p-3">{t('users.email')}</th>
              <th className="p-3">{t('users.role')}</th>
              <th className="p-3">{t('users.status')}</th>
              <th className="p-3">{t('users.action')}</th>
            </tr>
          </thead>
          <tbody>
            {(data as Array<{ id: string; email: string; role: string; enabled: boolean }>).map(u => (
              <tr key={u.id} className="border-b border-gray-700">
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <select value={u.role} onChange={e => api.updateUserRole(u.id, e.target.value).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))}
                    className="bg-gray-700 rounded px-2 py-1">
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="p-3">{u.enabled ? t('common.active') : t('common.inactive')}</td>
                <td className="p-3">
                  <button onClick={() => api.updateUserEnabled(u.id, !u.enabled).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))}
                    className="text-xs text-blue-400">{u.enabled ? t('common.deactivate') : t('common.activate')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
