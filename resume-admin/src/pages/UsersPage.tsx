import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, getUserRole } from '@/lib/api';
import { ALL_ROLES, isFullAdmin } from '@/lib/roles';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type UserRow = {
  id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  enabled: boolean;
};

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fullAdmin = isFullAdmin(getUserRole());
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof ALL_ROLES)[number]>('USER');
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.listUsers });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data as UserRow[];
    return (data as UserRow[]).filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.role.toLowerCase().includes(q) ||
        t(`users.roles.${u.role}`, { defaultValue: u.role }).toLowerCase().includes(q),
    );
  }, [data, search, t]);

  const comparators = useMemo(
    () => ({
      email: (a: UserRow, b: UserRow) => a.email.localeCompare(b.email),
      name: (a: UserRow, b: UserRow) => (a.name ?? '').localeCompare(b.name ?? ''),
      role: (a: UserRow, b: UserRow) => a.role.localeCompare(b.role),
      status: (a: UserRow, b: UserRow) => Number(b.enabled) - Number(a.enabled),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'email');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 10);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createUser({
        email: email.trim(),
        password,
        role: fullAdmin ? role : 'USER',
        name: name.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setEmail('');
      setPassword('');
      setName('');
      setRole('USER');
      toast.success(t('users.created'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('No user');
      return api.updateUser(editing.id, {
        email: editEmail.trim(),
        name: editName,
        phone: editPhone,
        password: editPassword.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setEditPassword('');
      toast.success(t('users.updated'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditEmail(u.email);
    setEditName(u.name ?? '');
    setEditPhone(u.phone ?? '');
    setEditPassword('');
  };

  const canEditRow = (u: UserRow) => fullAdmin || u.role === 'USER';

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
          <CardTitle>{fullAdmin ? t('users.createTitle') : t('users.signupTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {fullAdmin ? t('users.createHint') : t('users.signupHint')}
          </p>
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
            {fullAdmin && (
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
            )}
          </div>
          <Button
            disabled={!email.trim() || password.length < 8 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {fullAdmin ? t('users.create') : t('users.signup')}
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
            <TableSkeletonRows rows={5} cols={5} />
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
                  <SortableTableHead label={t('users.name')} sortKey="name" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden md:table-cell" />
                  <SortableTableHead label={t('users.role')} sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('users.status')} sortKey="status" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="text-right">{t('users.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{u.name || '—'}</TableCell>
                    <TableCell>
                      {fullAdmin ? (
                        <Select
                          value={u.role}
                          onValueChange={(nextRole) =>
                            api.updateUserRole(u.id, nextRole).then(() => invalidate())
                          }
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>{roleOptions}</SelectContent>
                        </Select>
                      ) : (
                        t(`users.roles.${u.role}`, { defaultValue: u.role })
                      )}
                    </TableCell>
                    <TableCell>{u.enabled ? t('common.active') : t('common.inactive')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEditRow(u) && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            {t('common.edit')}
                          </Button>
                        )}
                        {canEditRow(u) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              api.updateUserEnabled(u.id, !u.enabled).then(() => invalidate())
                            }
                          >
                            {u.enabled ? t('common.deactivate') : t('common.activate')}
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
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.editTitle')}</DialogTitle>
            <DialogDescription>{t('users.editHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">{t('users.email')}</Label>
              <Input id="edit-user-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">{t('users.name')}</Label>
              <Input id="edit-user-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-phone">{t('users.phone')}</Label>
              <Input id="edit-user-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">{t('users.newPassword')}</Label>
              <Input
                id="edit-user-password"
                type="password"
                autoComplete="new-password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('users.newPasswordHint')}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={!editEmail.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
