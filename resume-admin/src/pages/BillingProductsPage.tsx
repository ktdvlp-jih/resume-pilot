import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OPERATIONS = [
  'GENERATE', 'JOB_ANALYSIS', 'AI_REVIEW', 'AI_HUMANIZE', 'INTERVIEW_QUESTIONS',
  'PORTFOLIO_REVIEW', 'AI_DETECTION', 'KEYWORD_COMPARE', 'SECTION_ANALYSIS',
];

type Product = {
  id: string;
  name: string;
  kind: string;
  operation?: string;
  grantAmount: number;
  priceKrw: number;
  enabled: boolean;
  sortOrder: number;
};

const emptyForm = {
  id: undefined as string | undefined,
  name: '',
  kind: 'TOKEN',
  operation: 'GENERATE',
  grantAmount: 100,
  priceKrw: 1000,
  enabled: true,
  sortOrder: 0,
};

export default function BillingProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [costEdits, setCostEdits] = useState<Record<string, string>>({});

  const productsQuery = useQuery({ queryKey: ['admin-billing-products'], queryFn: api.listBillingProducts });
  const costsQuery = useQuery({ queryKey: ['admin-operation-costs'], queryFn: api.listOperationCosts });

  const saveProduct = useMutation({
    mutationFn: () =>
      api.upsertBillingProduct({
        id: form.id,
        name: form.name,
        kind: form.kind,
        operation: form.kind === 'COUNT' ? form.operation : undefined,
        grantAmount: form.grantAmount,
        priceKrw: form.priceKrw,
        enabled: form.enabled,
        sortOrder: form.sortOrder,
      }),
    onSuccess: () => {
      toast.success(t('common.save'));
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-billing-products'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const saveCost = useMutation({
    mutationFn: ({ operation, tokenCost }: { operation: string; tokenCost: number }) =>
      api.updateOperationCost(operation, tokenCost),
    onSuccess: () => {
      toast.success(t('common.save'));
      queryClient.invalidateQueries({ queryKey: ['admin-operation-costs'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const products = (productsQuery.data ?? []) as Product[];
  const costs = costsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.billingProducts')} description={t('billingProducts.desc')} />

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? t('common.edit') : t('common.add')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>{t('billingProducts.name')}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('billingProducts.kind')}</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TOKEN">TOKEN</SelectItem>
                <SelectItem value="COUNT">COUNT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.kind === 'COUNT' && (
            <div className="flex flex-col gap-2">
              <Label>{t('billingProducts.operation')}</Label>
              <Select value={form.operation} onValueChange={(v) => setForm({ ...form, operation: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATIONS.map((op) => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>{t('billingProducts.grantAmount')}</Label>
            <Input
              type="number"
              value={form.grantAmount}
              onChange={(e) => setForm({ ...form, grantAmount: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('billingProducts.priceKrw')}</Label>
            <Input
              type="number"
              value={form.priceKrw}
              onChange={(e) => setForm({ ...form, priceKrw: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('billingProducts.sortOrder')}</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            <Label>{t('common.active')}</Label>
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={() => saveProduct.mutate()} disabled={!form.name || saveProduct.isPending}>
              {t('common.save')}
            </Button>
            {form.id && (
              <Button variant="outline" onClick={() => setForm(emptyForm)}>{t('common.cancel')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('billingProducts.list')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('billingProducts.name')}</TableHead>
                <TableHead>{t('billingProducts.kind')}</TableHead>
                <TableHead>{t('billingProducts.operation')}</TableHead>
                <TableHead>{t('billingProducts.grantAmount')}</TableHead>
                <TableHead>{t('billingProducts.priceKrw')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.kind}</TableCell>
                  <TableCell>{p.operation ?? '-'}</TableCell>
                  <TableCell>{p.grantAmount}</TableCell>
                  <TableCell>{p.priceKrw.toLocaleString()}원</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setForm({
                        id: p.id,
                        name: p.name,
                        kind: p.kind,
                        operation: p.operation ?? 'GENERATE',
                        grantAmount: p.grantAmount,
                        priceKrw: p.priceKrw,
                        enabled: p.enabled,
                        sortOrder: p.sortOrder,
                      })}
                    >
                      {t('common.edit')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('billingProducts.costs')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('billingProducts.operation')}</TableHead>
                <TableHead>{t('billingProducts.tokenCost')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((c) => (
                <TableRow key={c.operation}>
                  <TableCell>{c.operation}</TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      type="number"
                      value={costEdits[c.operation] ?? String(c.tokenCost)}
                      onChange={(e) => setCostEdits((prev) => ({ ...prev, [c.operation]: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() =>
                        saveCost.mutate({
                          operation: c.operation,
                          tokenCost: Number(costEdits[c.operation] ?? c.tokenCost),
                        })
                      }
                    >
                      {t('common.save')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
