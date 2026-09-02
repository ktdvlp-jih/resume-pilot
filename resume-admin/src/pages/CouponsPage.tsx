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
import { Badge } from '@/components/ui/badge';

const OPERATIONS = [
  'GENERATE', 'JOB_ANALYSIS', 'AI_REVIEW', 'AI_HUMANIZE', 'INTERVIEW_QUESTIONS',
  'PORTFOLIO_REVIEW', 'AI_DETECTION', 'KEYWORD_COMPARE', 'SECTION_ANALYSIS',
];

type CouponRow = {
  id: string;
  code: string;
  kind: string;
  operation?: string;
  grantAmount: number;
  maxRedemptions: number;
  redemptionCount: number;
  validUntil?: string;
  enabled: boolean;
  note?: string;
  createdByAdminEmail?: string;
  createdAt: string;
};

const emptyForm = {
  code: '',
  kind: 'TOKEN',
  operation: 'GENERATE',
  grantAmount: 100,
  maxRedemptions: 1,
  validUntil: '',
  note: '',
};

function formatWhen(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

export default function CouponsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  const couponsQuery = useQuery({ queryKey: ['admin-coupons'], queryFn: api.listCoupons });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCoupon({
        code: form.code.trim() || undefined,
        kind: form.kind,
        operation: form.kind === 'COUNT' ? form.operation : undefined,
        grantAmount: form.grantAmount,
        maxRedemptions: form.maxRedemptions,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        note: form.note.trim() || undefined,
      }),
    onSuccess: (created) => {
      toast.success(t('coupons.created', { code: created.code }));
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.setCouponEnabled(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const coupons = (couponsQuery.data ?? []) as CouponRow[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.coupons')} description={t('coupons.desc')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('coupons.createTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>{t('coupons.code')}</Label>
            <Input
              value={form.code}
              placeholder={t('coupons.codeAuto')}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
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
            <Label>{t('coupons.maxRedemptions')}</Label>
            <Input
              type="number"
              min={1}
              value={form.maxRedemptions}
              onChange={(e) => setForm({ ...form, maxRedemptions: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('coupons.validUntil')}</Label>
            <Input
              type="datetime-local"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>{t('userWallet.note')}</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Button
              disabled={createMutation.isPending || form.grantAmount < 1 || form.maxRedemptions < 1}
              onClick={() => createMutation.mutate()}
            >
              {t('coupons.issue')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('coupons.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('coupons.code')}</TableHead>
                <TableHead>{t('billingProducts.grantAmount')}</TableHead>
                <TableHead>{t('coupons.usage')}</TableHead>
                <TableHead>{t('coupons.validUntil')}</TableHead>
                <TableHead>{t('payments.status')}</TableHead>
                <TableHead>{t('coupons.issuedBy')}</TableHead>
                <TableHead className="text-right">{t('common.edit')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell>
                    {c.kind === 'TOKEN'
                      ? t('coupons.tokenAmount', { amount: c.grantAmount })
                      : `${c.operation} × ${c.grantAmount}`}
                  </TableCell>
                  <TableCell>{c.redemptionCount} / {c.maxRedemptions}</TableCell>
                  <TableCell>{formatWhen(c.validUntil)}</TableCell>
                  <TableCell>
                    <Badge variant={c.enabled ? 'secondary' : 'outline'}>
                      {c.enabled ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.createdByAdminEmail ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={c.enabled}
                        onCheckedChange={(enabled) => toggleMutation.mutate({ id: c.id, enabled })}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(c.code);
                          toast.success(t('coupons.copied'));
                        }}
                      >
                        {t('coupons.copy')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('coupons.empty')}
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
