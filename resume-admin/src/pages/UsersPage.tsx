import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UserRow = { id: string; email: string; role: string; enabled: boolean };

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.listUsers });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as UserRow[];
    return (data as UserRow[]).filter(
      (u) => u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
    );
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      email: (a: UserRow, b: UserRow) => a.email.localeCompare(b.email),
      role: (a: UserRow, b: UserRow) => a.role.localeCompare(b.role),
      status: (a: UserRow, b: UserRow) => Number(b.enabled) - Number(a.enabled),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'email');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 10);

  return (
    <div className="space-y-4">
      <PageHeader title={t('users.title')} />
      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.email')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={5} cols={4} />
          </Table>
        </DataTableCard>
      ) : filtered.length === 0 && !search ? (
        <EmptyState title={t('users.empty', { defaultValue: t('aiLogs.empty') })} />
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
                  <SortableTableHead label={t('users.email')} sortKey="email" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('users.role')} sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('users.status')} sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="text-right">{t('users.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(role) =>
                          api.updateUserRole(u.id, role).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">USER</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{u.enabled ? t('common.active') : t('common.inactive')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          api.updateUserEnabled(u.id, !u.enabled).then(() =>
                            queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
                          )
                        }
                      >
                        {u.enabled ? t('common.deactivate') : t('common.activate')}
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
