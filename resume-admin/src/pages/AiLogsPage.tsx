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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LogRow = {
  id: string;
  service: string;
  operation: string;
  status: string;
  durationMs: number;
  createdAt: string;
};

export default function AiLogsPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-ai-logs'], queryFn: api.listAiLogs });

  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as LogRow[];
    return (data as LogRow[]).filter(
      (l) =>
        l.service.toLowerCase().includes(q) ||
        l.operation.toLowerCase().includes(q) ||
        l.status.toLowerCase().includes(q),
    );
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
      <PageHeader title={t('aiLogs.title')} />
      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('aiLogs.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={8} cols={5} />
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
                  <TableHead>{t('aiLogs.status')}</TableHead>
                  <SortableTableHead label={t('aiLogs.duration')} sortKey="duration" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{new Date(l.createdAt).toLocaleString(dateLocale)}</TableCell>
                    <TableCell>{l.service}</TableCell>
                    <TableCell>{l.operation}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'SUCCESS' ? 'secondary' : 'destructive'}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{l.durationMs}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}
    </div>
  );
}
