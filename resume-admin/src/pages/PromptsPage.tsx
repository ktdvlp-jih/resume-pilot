import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GitCompare } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { PromptVersionDiffDialog, type PromptVersionDetail } from '@/components/prompts/prompt-version-diff-dialog';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { cn } from '@/lib/utils';

type PromptRow = { id: string; name: string; type: string };
type VersionRow = PromptVersionDetail;

export default function PromptsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const selectedId = params.get('prompt') ?? '';
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [testResult, setTestResult] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffInitial, setDiffInitial] = useState<{ a?: number; b?: number }>({});

  const { data: prompts = [] } = useQuery({ queryKey: ['admin-prompts'], queryFn: api.listPrompts });
  const { data: versions = [], isLoading: versionsLoading } = useQuery({
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

  const versionComparators = useMemo(
    () => ({
      version: (a: VersionRow, b: VersionRow) => a.versionNumber - b.versionNumber,
      status: (a: VersionRow, b: VersionRow) => Number(b.active) - Number(a.active),
    }),
    [],
  );

  const { sorted: sortedVersions, sortKey, direction, toggleSort } = useUrlSort(
    versions as VersionRow[],
    versionComparators,
    'version',
    'desc',
  );
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sortedVersions, 10);

  const selectPrompt = (id: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set('prompt', id);
        else next.delete('prompt');
        next.delete('page');
        next.delete('sort');
        next.delete('dir');
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
  const versionDetails = versions as VersionRow[];

  const openDiff = (a?: number, b?: number) => {
    const active = versionDetails.find((v) => v.active);
    const nums = versionDetails.map((v) => v.versionNumber).sort((x, y) => x - y);
    setDiffInitial({
      a: a ?? nums[0],
      b: b ?? active?.versionNumber ?? nums[nums.length - 1],
    });
    setDiffOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('prompts.title')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTableCard
          toolbar={
            <SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  {t('prompts.versions', { name: selected?.name })}
                </h3>
                {versionDetails.length >= 2 && (
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openDiff()}>
                    <GitCompare className="size-3.5" />
                    {t('prompts.compare')}
                  </Button>
                )}
              </div>
              <DataTableCard
              footer={
                total > 10 ? (
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    from={from}
                    to={to}
                    total={total}
                    onPageChange={setPage}
                    className="w-full"
                  />
                ) : undefined
              }
            >
              {versionsLoading ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('prompts.versionColumn')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableSkeletonRows rows={3} cols={3} />
                </Table>
              ) : sortedVersions.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        label={t('prompts.versionColumn')}
                        sortKey="version"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={toggleSort}
                      />
                      <SortableTableHead
                        label={t('prompts.statusColumn')}
                        sortKey="status"
                        activeKey={sortKey}
                        direction={direction}
                        onSort={toggleSort}
                      />
                      <TableHead className="text-right">{t('users.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">v{v.versionNumber}</TableCell>
                        <TableCell>
                          {v.active ? (
                            <Badge variant="secondary">{t('common.active')}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('common.inactive')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {versionDetails.length >= 2 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0"
                                onClick={() => {
                                  const active = versionDetails.find((x) => x.active);
                                  openDiff(
                                    Math.min(v.versionNumber, active?.versionNumber ?? v.versionNumber),
                                    Math.max(v.versionNumber, active?.versionNumber ?? v.versionNumber),
                                  );
                                }}
                              >
                                {t('prompts.compare')}
                              </Button>
                            )}
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTableCard>
            </div>

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

      <PromptVersionDiffDialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        versions={versionDetails}
        initialA={diffInitial.a}
        initialB={diffInitial.b}
      />
    </div>
  );
}
