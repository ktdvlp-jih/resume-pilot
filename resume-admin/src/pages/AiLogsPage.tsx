import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function AiLogsPage() {
  const { t, i18n } = useTranslation();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-ai-logs'], queryFn: api.listAiLogs });

  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t('aiLogs.title')}</h2>
      {isLoading ? <p>{t('common.loading')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-gray-800 rounded-xl">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="p-3">{t('aiLogs.time')}</th>
                <th className="p-3">{t('aiLogs.service')}</th>
                <th className="p-3">{t('aiLogs.operation')}</th>
                <th className="p-3">{t('aiLogs.status')}</th>
                <th className="p-3">{t('aiLogs.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {(data as Array<{ id: string; service: string; operation: string; status: string; durationMs: number; createdAt: string }>).map(l => (
                <tr key={l.id} className="border-b border-gray-700">
                  <td className="p-3 text-gray-400">{new Date(l.createdAt).toLocaleString(dateLocale)}</td>
                  <td className="p-3">{l.service}</td>
                  <td className="p-3">{l.operation}</td>
                  <td className={`p-3 ${l.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}`}>{l.status}</td>
                  <td className="p-3">{l.durationMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="text-gray-500 p-4">{t('aiLogs.empty')}</p>}
        </div>
      )}
    </div>
  );
}
