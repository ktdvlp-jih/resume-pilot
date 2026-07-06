import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
    mutationFn: () => api.testPrompt({ promptType: prompts.find((p) => p.id === selectedId)?.type, systemPrompt, userPrompt }),
    onSuccess: (res) => setTestResult(res.result),
  });

  const selected = prompts.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader title={t('prompts.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('prompts.templates')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(prompts as Array<{ id: string; name: string; type: string }>).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                  selectedId === p.id && 'border-primary bg-accent'
                )}
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.type}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {selectedId && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t('prompts.versions', { name: selected?.name })}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(versions as Array<{ id: string; versionNumber: number; active: boolean }>).map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-sm">
                      v{v.versionNumber} {v.active && <Badge variant="secondary" className="ml-1">{t('common.active')}</Badge>}
                    </span>
                    {!v.active && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => api.activatePromptVersion(selectedId, v.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-prompt-versions', selectedId] }))}
                      >
                        {t('common.activate')}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('prompts.newVersion')}</CardTitle></CardHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}>
                <CardContent className="space-y-3">
                  <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder={t('prompts.systemPrompt')} rows={4} required />
                  <Textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder={t('prompts.userPrompt')} rows={4} required />
                  <div className="flex gap-2">
                    <Button type="submit">{t('prompts.saveAndActivate')}</Button>
                    <Button type="button" variant="secondary" onClick={() => testMutation.mutate()}>{t('common.test')}</Button>
                  </div>
                </CardContent>
              </form>
            </Card>

            {testResult && (
              <Card>
                <CardHeader><CardTitle>{t('prompts.testResult')}</CardTitle></CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm">{testResult}</CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
