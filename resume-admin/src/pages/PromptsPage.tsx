import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';

export default function PromptsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [testResult, setTestResult] = useState('');

  const { data: prompts = [] } = useQuery({ queryKey: ['admin-prompts'], queryFn: api.listPrompts });
  const { data: versions = [] } = useQuery({
    queryKey: ['admin-prompt-versions', selectedId],
    queryFn: () => api.listPromptVersions(selectedId),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createPromptVersion(selectedId, systemPrompt, userPrompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prompt-versions', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['admin-prompts'] });
      setSystemPrompt('');
      setUserPrompt('');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.testPrompt({ promptType: prompts.find(p => p.id === selectedId)?.type, systemPrompt, userPrompt }),
    onSuccess: (res) => setTestResult(res.result),
  });

  const selected = prompts.find(p => p.id === selectedId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('prompts.title')}</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-3">{t('prompts.templates')}</h3>
          <ul className="space-y-2">
            {(prompts as Array<{ id: string; name: string; type: string; description?: string }>).map(p => (
              <li key={p.id}>
                <button onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left p-3 rounded-lg ${selectedId === p.id ? 'bg-blue-900' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.type}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {selectedId && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">{t('prompts.versions', { name: selected?.name })}</h3>
              {(versions as Array<{ id: string; versionNumber: number; active: boolean }>).map(v => (
                <div key={v.id} className="flex justify-between items-center p-2 border-b border-gray-700">
                  <span>v{v.versionNumber} {v.active && <span className="text-green-400 text-xs">{t('common.active')}</span>}</span>
                  {!v.active && (
                    <button onClick={() => api.activatePromptVersion(selectedId, v.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-prompt-versions', selectedId] }))}
                      className="text-xs text-blue-400">{t('common.activate')}</button>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="bg-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">{t('prompts.newVersion')}</h3>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder={t('prompts.systemPrompt')} rows={4}
                className="w-full px-3 py-2 bg-gray-700 rounded text-sm" required />
              <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder={t('prompts.userPrompt')} rows={4}
                className="w-full px-3 py-2 bg-gray-700 rounded text-sm" required />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-blue-600 rounded text-sm">{t('prompts.saveAndActivate')}</button>
                <button type="button" onClick={() => testMutation.mutate()} className="px-4 py-2 bg-gray-600 rounded text-sm">{t('common.test')}</button>
              </div>
            </form>
            {testResult && (
              <div className="bg-gray-800 rounded-xl p-4 text-sm whitespace-pre-wrap">
                <h3 className="font-semibold mb-2">{t('prompts.testResult')}</h3>
                {testResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
