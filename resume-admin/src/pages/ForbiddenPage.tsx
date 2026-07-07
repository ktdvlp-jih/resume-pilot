import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { usePagination } from '@/hooks/use-pagination';
import { useSort } from '@/hooks/use-sort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ForbiddenRow = { id: string; expression: string; suggestion?: string };

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expression, setExpression] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-forbidden'], queryFn: api.listForbidden });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as ForbiddenRow[];
    return (data as ForbiddenRow[]).filter(
      (f) =>
        f.expression.toLowerCase().includes(q) ||
        (f.suggestion?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      expression: (a: ForbiddenRow, b: ForbiddenRow) => a.expression.localeCompare(b.expression),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, comparators, 'expression');
  const { page, setPage, totalPages, paginated, from, to, total } = usePagination(sorted, 10);

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
      <PageHeader title={t('forbidden.title')} />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t('common.add')}</CardTitle>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t('forbidden.expression')}</Label>
              <Input value={expression} onChange={(e) => setExpression(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('forbidden.suggestion')}</Label>
              <Input value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
            </div>
            <Button type="submit">{t('common.add')}</Button>
          </CardContent>
        </form>
      </Card>

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('forbidden.expression')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={5} cols={3} />
          </Table>
        </DataTableCard>
      ) : (data as ForbiddenRow[]).length === 0 ? (
        <EmptyState title={t('forbidden.empty', { defaultValue: t('aiLogs.empty') })} />
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
                  <SortableTableHead label={t('forbidden.expression')} sortKey="expression" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead>{t('forbidden.suggestion')}</TableHead>
                  <TableHead className="text-right">{t('common.delete')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.expression}</TableCell>
                    <TableCell className="text-muted-foreground">{f.suggestion || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() =>
                          api.deleteForbidden(f.id).then(() => queryClient.invalidateQueries({ queryKey: ['admin-forbidden'] }))
                        }
                      >
                        {t('common.delete')}
                      </Button>
                    </TableCell>
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
