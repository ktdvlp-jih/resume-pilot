import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type PromptRow = { id: string; name: string; type: string };

export default function PromptsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const selectedId = params.get('prompt') ?? '';
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [testResult, setTestResult] = useState('');

  const { data: prompts = [] } = useQuery({ queryKey: ['admin-prompts'], queryFn: api.listPrompts });
  const { data: versions = [] } = useQuery({
    queryKey: ['admin-prompt-versions', selectedId],
    queryFn: () => api.listPromptVersions(selectedId),
    enabled: !!selectedId,
  });

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const q = search.trim();
        if (q) next.set('q', q);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [search, setParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = prompts as PromptRow[];
    if (!q) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q),
    );
  }, [prompts, search]);

  const selectPrompt = (id: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('prompt', id);
        else next.delete('prompt');
        return next;
      },
      { replace: true },
    );
    setSystemPrompt('');
    setUserPrompt('');
    setTestResult('');
  };

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
    mutationFn: () =>
      api.testPrompt({
        promptType: (prompts as PromptRow[]).find((p) => p.id === selectedId)?.type,
        systemPrompt,
        userPrompt,
      }),
    onSuccess: (res) => setTestResult(res.result),
  });

  const selected = (prompts as PromptRow[]).find((p) => p.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader title={t('prompts.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTableCard
          toolbar={
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('common.searchPlaceholder')}
            />
          }
        >
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPrompt(p.id)}
                  className={cn(
                    'w-full p-4 text-left transition-colors hover:bg-accent',
                    selectedId === p.id && 'bg-accent',
                  )}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.type}</p>
                </button>
              ))}
            </div>
          )}
        </DataTableCard>

        {selectedId && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('prompts.versions', { name: selected?.name })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(versions as Array<{ id: string; versionNumber: number; active: boolean }>).map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b py-2 last:border-0">
                    <span className="text-sm">
                      v{v.versionNumber}{' '}
                      {v.active && (
                        <Badge variant="secondary" className="ml-1">
                          {t('common.active')}
                        </Badge>
                      )}
                    </span>
                    {!v.active && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() =>
                          api.activatePromptVersion(selectedId, v.id).then(() =>
                            queryClient.invalidateQueries({ queryKey: ['admin-prompt-versions', selectedId] }),
                          )
                        }
                      >
                        {t('common.activate')}
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('prompts.newVersion')}</CardTitle>
              </CardHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMutation.mutate();
                }}
              >
                <CardContent className="space-y-3">
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={t('prompts.systemPrompt')}
                    rows={4}
                    required
                  />
                  <Textarea
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder={t('prompts.userPrompt')}
                    rows={4}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit">{t('prompts.saveAndActivate')}</Button>
                    <Button type="button" variant="secondary" onClick={() => testMutation.mutate()}>
                      {t('common.test')}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>

            {testResult && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('prompts.testResult')}</CardTitle>
                </CardHeader>
                <CardContent className="whitespace-pre-wrap text-sm">{testResult}</CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
