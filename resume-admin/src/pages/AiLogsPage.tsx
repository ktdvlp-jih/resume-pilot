import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatModelDisplay } from '@/lib/model-labels';

type LogRow = {
  id: string;
  userId?: string;
  service: string;
  operation: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  status: string;
  durationMs: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

function metaString(meta: Record<string, unknown> | undefined, key: string): string {
  if (!meta) return '';
  const value = meta[key];
  return value == null ? '' : String(value);
}

export default function AiLogsPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LogRow | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-ai-logs'], queryFn: api.listAiLogs });

  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as LogRow[];
    return (data as LogRow[]).filter((l) => {
      const method = metaString(l.metadata, 'extraction_method').toLowerCase();
      const source = metaString(l.metadata, 'source_type').toLowerCase();
      const company = metaString(l.metadata, 'company_name').toLowerCase();
      return (
        l.service.toLowerCase().includes(q) ||
        l.operation.toLowerCase().includes(q) ||
        (l.model || '').toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q) ||
        method.includes(q) ||
        source.includes(q) ||
        company.includes(q)
      );
    });
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      time: (a: LogRow, b: LogRow) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      service: (a: LogRow, b: LogRow) => a.service.localeCompare(b.service),
      duration: (a: LogRow, b: LogRow) => a.durationMs - b.durationMs,
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'time', 'desc');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 15);

  return (
    <div className="space-y-4">
      <PageHeader title={t('aiLogs.title')} description={t('aiLogs.subtitle')} />
      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('aiLogs.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={8} cols={7} />
          </Table>
        </DataTableCard>
      ) : (data as LogRow[]).length === 0 ? (
        <EmptyState title={t('aiLogs.empty')} />
      ) : (
        <DataTableCard
          toolbar={<SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />}
          footer={
            <PaginationControls page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} className="w-full" />
          }
        >
          {paginated.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('aiLogs.time')} sortKey="time" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('aiLogs.service')} sortKey="service" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead>{t('aiLogs.operation')}</TableHead>
                  <TableHead>{t('aiLogs.method')}</TableHead>
                  <TableHead>{t('aiLogs.model')}</TableHead>
                  <TableHead>{t('aiLogs.status')}</TableHead>
                  <SortableTableHead label={t('aiLogs.duration')} sortKey="duration" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((l) => {
                  const method = metaString(l.metadata, 'extraction_method') || metaString(l.metadata, 'source_type') || '—';
                  return (
                    <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                      <TableCell className="text-muted-foreground">{new Date(l.createdAt).toLocaleString(dateLocale)}</TableCell>
                      <TableCell>{l.service}</TableCell>
                      <TableCell>{l.operation}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs" title={formatModelDisplay(l.model)}>
                        {formatModelDisplay(l.model)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'SUCCESS' ? 'secondary' : 'destructive'}>{l.status}</Badge>
                      </TableCell>
                      <TableCell>{l.durationMs}ms</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(l);
                          }}
                        >
                          {t('aiLogs.detail')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{t('aiLogs.detailTitle')}</SheetTitle>
                <SheetDescription>
                  {selected.operation} · {formatModelDisplay(selected.model)} · {new Date(selected.createdAt).toLocaleString(dateLocale)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 px-1 pb-6">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('aiLogs.status')}</dt>
                    <dd>
                      <Badge variant={selected.status === 'SUCCESS' ? 'secondary' : 'destructive'}>{selected.status}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('aiLogs.duration')}</dt>
                    <dd>{selected.durationMs}ms</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('aiLogs.method')}</dt>
                    <dd className="font-mono text-xs">
                      {metaString(selected.metadata, 'extraction_method') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('aiLogs.sourceType')}</dt>
                    <dd className="font-mono text-xs">{metaString(selected.metadata, 'source_type') || '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">{t('aiLogs.company')}</dt>
                    <dd>{metaString(selected.metadata, 'company_name') || '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">{t('aiLogs.position')}</dt>
                    <dd>{metaString(selected.metadata, 'position') || '—'}</dd>
                  </div>
                </dl>

                {selected.errorMessage && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-destructive">{t('aiLogs.error')}</p>
                    <pre className="overflow-x-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs whitespace-pre-wrap">
                      {selected.errorMessage}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-sm font-medium">{t('aiLogs.counts')}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(['required_skills_count', 'preferred_skills_count', 'job_responsibilities_count', 'qualifications_count', 'tech_keywords_count'] as const).map(
                      (key) => (
                        <Badge key={key} variant="outline">
                          {key.replace('_count', '')}: {String(selected.metadata?.[key] ?? 0)}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium">{t('aiLogs.metadata')}</p>
                  <pre className="max-h-[50vh] overflow-auto rounded-lg border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                    {JSON.stringify(selected.metadata ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
