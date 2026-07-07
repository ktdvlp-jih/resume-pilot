import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { EXPERIENCE_TYPES } from '@/i18n';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { StatusChip } from '@/components/common/status-chip';
import { usePagination } from '@/hooks/use-pagination';
import { useSort } from '@/hooks/use-sort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [form, setForm] = useState({ type: 'PROJECT', title: '', description: '', role: '', result: '' });

  const { data: experiences = [], isLoading } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return experiences.filter((exp) => {
      if (typeFilter !== 'ALL' && exp.type !== typeFilter) return false;
      if (!q) return true;
      return (
        exp.title.toLowerCase().includes(q) ||
        (exp.description?.toLowerCase().includes(q) ?? false) ||
        (exp.role?.toLowerCase().includes(q) ?? false) ||
        t(`experienceType.${exp.type}`, { defaultValue: exp.type }).toLowerCase().includes(q)
      );
    });
  }, [experiences, search, typeFilter, t]);

  const comparators = useMemo(
    () => ({
      type: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => a.type.localeCompare(b.type),
      title: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => a.title.localeCompare(b.title),
      role: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => (a.role ?? '').localeCompare(b.role ?? ''),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useSort(filtered, comparators, 'title');
  const { page, setPage, totalPages, paginated, from, to, total } = usePagination(sorted, 10);

  const createMutation = useMutation({
    mutationFn: api.createExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setShowForm(false);
      setForm({ type: 'PROJECT', title: '', description: '', role: '', result: '' });
      toast.success(t('common.saved'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  return (
    <PageShell size="lg">
      <PageHeader
        title={t('experiences.title')}
        action={
          <Button variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm(!showForm)}>
            {showForm ? t('common.cancel') : t('experiences.add')}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t('experiences.add')}</CardTitle>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('experiences.typeLabel')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`experienceType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.titlePlaceholder')}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.descriptionPlaceholder')}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.rolePlaceholder')}</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('experiences.resultPlaceholder')}</Label>
                <Input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('common.save')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label={t('experiences.columns.type')} sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTableHead label={t('experiences.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={6} cols={5} />
          </Table>
        </DataTableCard>
      ) : experiences.length === 0 ? (
        <EmptyState
          title={t('experiences.empty')}
          action={<Button onClick={() => setShowForm(true)}>{t('experiences.add')}</Button>}
        />
      ) : (
        <DataTableCard
          toolbar={
            <>
              <SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  {EXPERIENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`experienceType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          footer={
            <PaginationControls
              page={page}
              totalPages={totalPages}
              from={from}
              to={to}
              total={total}
              onPageChange={setPage}
              className="w-full"
            />
          }
        >
          {paginated.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('experiences.columns.type')} sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('experiences.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('experiences.columns.role')} sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden md:table-cell" />
                  <TableHead className="hidden lg:table-cell">{t('experiences.columns.result')}</TableHead>
                  <TableHead className="text-right">{t('experiences.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <StatusChip label={t(`experienceType.${exp.type}`, { defaultValue: exp.type })} variant="primary" />
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{exp.title}</p>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{exp.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{exp.role || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[200px] truncate">
                      {exp.result || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive">
                            {t('common.delete')}
                          </Button>
                        }
                        title={t('common.confirmDelete')}
                        description={t('common.confirmDeleteDesc')}
                        confirmLabel={t('common.delete')}
                        cancelLabel={t('common.cancel')}
                        destructive
                        onConfirm={() => deleteMutation.mutate(exp.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}
    </PageShell>
  );
}
