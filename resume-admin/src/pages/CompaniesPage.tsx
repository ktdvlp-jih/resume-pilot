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
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CompanyRow = { id: string; name: string; culture?: string; hiringKeywords: string[] };

export default function CompaniesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [culture, setCulture] = useState('');
  const [keywords, setKeywords] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-companies'], queryFn: api.listCompanies });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as CompanyRow[];
    return (data as CompanyRow[]).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.culture?.toLowerCase().includes(q) ?? false) ||
        c.hiringKeywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      name: (a: CompanyRow, b: CompanyRow) => a.name.localeCompare(b.name),
      culture: (a: CompanyRow, b: CompanyRow) => (a.culture ?? '').localeCompare(b.culture ?? ''),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'name');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 10);

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.updateCompany(id, {
        culture,
        hiringKeywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditId(null);
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title={t('companies.title')} />
      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('companies.name')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={5} cols={4} />
          </Table>
        </DataTableCard>
      ) : (data as CompanyRow[]).length === 0 ? (
        <EmptyState title={t('companies.empty', { defaultValue: t('aiLogs.empty') })} />
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
                  <SortableTableHead label={t('companies.name')} sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('companies.culture')} sortKey="culture" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead>{t('companies.hiringKeywords')}</TableHead>
                  <TableHead className="text-right">{t('common.edit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{c.culture || '—'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[240px] truncate">
                      {c.hiringKeywords?.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditId(c.id);
                          setCulture(c.culture || '');
                          setKeywords((c.hiringKeywords || []).join(', '));
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}

      {editId && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{t('companies.editCompany')}</CardTitle>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editId);
            }}
          >
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>{t('companies.orgCulture')}</Label>
                <Input value={culture} onChange={(e) => setCulture(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('companies.keywordsPlaceholder')}</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </div>
              <Button type="submit">{t('common.save')}</Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
