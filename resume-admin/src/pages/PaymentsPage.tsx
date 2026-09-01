import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function PaymentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-payments'], queryFn: api.listPayments });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelPayment(id, '관리자 취소'),
    onSuccess: () => {
      toast.success(t('payments.cancelled'));
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const rows = query.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.payments')} description={t('payments.desc')} />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('payments.createdAt')}</TableHead>
                <TableHead>{t('payments.userId')}</TableHead>
                <TableHead>{t('payments.product')}</TableHead>
                <TableHead>{t('payments.amount')}</TableHead>
                <TableHead>{t('payments.status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{p.userId.slice(0, 8)}…</TableCell>
                  <TableCell>{p.productName}</TableCell>
                  <TableCell>{p.amountKrw.toLocaleString()}원</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'COMPLETED' ? 'default' : 'secondary'}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancelMutation.isPending}
                        onClick={() => {
                          if (window.confirm(t('payments.cancelConfirm'))) {
                            cancelMutation.mutate(p.id);
                          }
                        }}
                      >
                        {t('payments.cancel')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
