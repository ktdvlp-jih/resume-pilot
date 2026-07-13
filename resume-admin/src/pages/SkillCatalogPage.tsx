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

type SkillRow = { id: number; name: string; category: string };

export default function SkillCatalogPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['admin-skill-catalog'], queryFn: api.listSkillCatalog });

  const categories = useMemo(
    () => Array.from(new Set((data as SkillRow[]).map((s) => s.category))).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as SkillRow[];
    return (data as SkillRow[]).filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      name: (a: SkillRow, b: SkillRow) => a.name.localeCompare(b.name),
      category: (a: SkillRow, b: SkillRow) => a.category.localeCompare(b.category),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'category');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 20);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-skill-catalog'] });

  const createMutation = useMutation({
    mutationFn: () => api.createSkillCatalog(name.trim(), category.trim()),
    onSuccess: () => {
      invalidate();
      setName('');
      setCategory('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) => api.updateSkillCatalog(id, { name: editName.trim(), category: editCategory.trim() }),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSkillCatalog(id),
    onSuccess: invalidate,
  });

  const startEdit = (row: SkillRow) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditCategory(row.category);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('skillCatalog.title')} />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t('common.add')}</CardTitle>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !category.trim()) return;
            createMutation.mutate();
          }}
        >
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t('skillCatalog.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('skillCatalog.category')}</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="skill-catalog-categories"
                placeholder={t('skillCatalog.categoryPlaceholder')}
                required
              />
              <datalist id="skill-catalog-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">{t('skillCatalog.categoryHint')}</p>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>{t('common.add')}</Button>
          </CardContent>
        </form>
      </Card>

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('skillCatalog.name')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={5} cols={3} />
          </Table>
        </DataTableCard>
      ) : (data as SkillRow[]).length === 0 ? (
        <EmptyState title={t('skillCatalog.empty')} />
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
                  <SortableTableHead label={t('skillCatalog.name')} sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('skillCatalog.category')} sortKey="category" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="text-right">{t('common.edit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s) => (
                  <TableRow key={s.id}>
                    {editingId === s.id ? (
                      <>
                        <TableCell>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            list="skill-catalog-categories"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            disabled={updateMutation.isPending}
                            onClick={() => updateMutation.mutate(s.id)}
                          >
                            {t('common.save')}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            {t('common.cancel')}
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.category}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(s.id)}
                          >
                            {t('common.delete')}
                          </Button>
                        </TableCell>
                      </>
                    )}
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
