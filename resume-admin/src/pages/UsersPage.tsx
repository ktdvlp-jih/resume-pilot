import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: api.listUsers });

  return (
    <div className="space-y-4">
      <PageHeader title={t('users.title')} />
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead>{t('users.status')}</TableHead>
                  <TableHead>{t('users.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Array<{ id: string; email: string; role: string; enabled: boolean }>).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(role) => api.updateUserRole(u.id, role).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">USER</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{u.enabled ? t('common.active') : t('common.inactive')}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => api.updateUserEnabled(u.id, !u.enabled).then(() => queryClient.invalidateQueries({ queryKey: ['admin-users'] }))}>
                        {u.enabled ? t('common.deactivate') : t('common.activate')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
