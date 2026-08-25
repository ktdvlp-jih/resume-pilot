import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ALL_ROLES } from '@/lib/roles';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UserRow = { id: string; email: string; role: string; enabled: boolean };

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof ALL_ROLES)[number]>('JOB_ADMIN');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.listUsers });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as UserRow[];
    return (data as UserRow[]).filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        t(`users.roles.${u.role}`, { defaultValue: u.role }).toLowerCase().includes(q),
    );
  }, [data, search, t]);

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

  const createMutation = useMutation({
    mutationFn: () =>
      api.createUser({
        email: email.trim(),
        password,
        role,
        name: name.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEmail('');
      setPassword('');
      setName('');
      setRole('JOB_ADMIN');
      toast.success(t('users.created'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const roleOptions = (
    <>
      {ALL_ROLES.map((value) => (
        <SelectItem key={value} value={value}>
          {t(`users.roles.${value}`)}
        </SelectItem>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('users.title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('users.createTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('users.createHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-user-email">{t('users.email')}</Label>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">{t('users.password')}</Label>
              <Input
                id="new-user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('users.passwordHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-name">{t('users.name')}</Label>
              <Input
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('users.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select value={role} onValueChange={(value) => setRole(value as (typeof ALL_ROLES)[number])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{roleOptions}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t(`users.roleHints.${role}`)}</p>
            </div>
          </div>
          <Button
            disabled={!email.trim() || password.length < 8 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {t('users.create')}
          </Button>
        </CardContent>
      </Card>

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
                        onValueChange={(nextRole) =>
                          api.updateUserRole(u.id, nextRole).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>{roleOptions}</SelectContent>
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
