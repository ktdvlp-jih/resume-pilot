import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, getAccessToken } from '@/lib/api';
import { loadTossPayments } from '@/lib/toss-payments';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Props = {
  /** true면 잔액·단가만 (충전 상품 숨김) */
  balanceOnly?: boolean;
};

export function BillingPanel({ balanceOnly = false }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const loggedIn = !!getAccessToken();
  const [couponCode, setCouponCode] = useState('');

  const clientKeyQuery = useQuery({
    queryKey: ['payment-client-key'],
    queryFn: api.getPaymentClientKey,
  });

  const walletQuery = useQuery({
    queryKey: ['billing-wallet'],
    queryFn: api.getBillingWallet,
    enabled: loggedIn,
  });

  const productsQuery = useQuery({
    queryKey: ['billing-products'],
    queryFn: api.listBillingProducts,
    enabled: !balanceOnly,
  });

  const ledgerQuery = useQuery({
    queryKey: ['billing-ledger'],
    queryFn: api.listBillingLedger,
    enabled: loggedIn,
  });

  const redeemMutation = useMutation({
    mutationFn: () => api.redeemCoupon(couponCode.trim()),
    onSuccess: () => {
      toast.success(t('billing.couponRedeemed'));
      setCouponCode('');
      queryClient.invalidateQueries({ queryKey: ['billing-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['billing-ledger'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('billing.couponError')),
  });

  const buyMutation = useMutation({
    mutationFn: async (productId: string) => {
      const clientKey = clientKeyQuery.data?.clientKey ?? '';
      if (!clientKey) {
        throw new Error(t('billing.noClientKey'));
      }
      const order = await api.createPaymentOrder(productId);
      const toss = await loadTossPayments(clientKey);
      const payment = toss.payment({ customerKey: order.customerKey });
      const origin = window.location.origin;
      await payment.requestPayment({
        method: 'CARD',
        amount: { value: order.amount, currency: 'KRW' },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${origin}/billing/complete`,
        failUrl: `${origin}/billing/fail`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('billing.buyError'));
    },
  });

  const clientKey = clientKeyQuery.data?.clientKey ?? '';
  const wallet = walletQuery.data;
  const products = productsQuery.data ?? [];
  const countBalances = wallet?.countBalances ?? {};
  const operationCosts = wallet?.operationCosts ?? [];

  return (
    <div className="flex flex-col gap-6" data-testid="billing-panel">
      {!balanceOnly && !clientKey && !clientKeyQuery.isLoading && (
        <Alert>
          <AlertDescription>{t('billing.noClientKey')}</AlertDescription>
        </Alert>
      )}

      {loggedIn && wallet && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.balance')}</CardTitle>
            <CardDescription>{t('billing.balanceHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="secondary" className="text-sm">
              {t('billing.tokens')}: {wallet.tokenBalance}
            </Badge>
            {Object.entries(countBalances).map(([op, n]) => (
              <Badge key={op} variant="outline" className="text-sm">
                {op}: {n}
              </Badge>
            ))}
            {Object.keys(countBalances).length === 0 && (
              <span className="text-sm text-muted-foreground">{t('billing.noCounts')}</span>
            )}
          </CardContent>
        </Card>
      )}

      {loggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.couponTitle')}</CardTitle>
            <CardDescription>{t('billing.couponHint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={couponCode}
              placeholder={t('billing.couponPlaceholder')}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
            <Button
              disabled={!couponCode.trim() || redeemMutation.isPending}
              onClick={() => redeemMutation.mutate()}
            >
              {t('billing.couponRedeem')}
            </Button>
          </CardContent>
        </Card>
      )}

      {loggedIn && ledgerQuery.data && ledgerQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.ledgerTitle')}</CardTitle>
            <CardDescription>{t('billing.ledgerHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {ledgerQuery.data.map((row) => (
                <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">
                      {t(`billing.ledgerTypes.${row.entryType}`, { defaultValue: row.entryType })}
                    </p>
                    <p className="text-muted-foreground">
                      +{row.amount}
                      {row.kind === 'TOKEN' ? ` ${t('billing.tokens')}` : row.operation ? ` (${row.operation})` : ''}
                    </p>
                    {row.entryType === 'ADMIN_GRANT' && row.grantedByAdminEmail && (
                      <p className="text-xs text-muted-foreground">
                        {t('billing.ledgerAdminBy', { email: row.grantedByAdminEmail })}
                      </p>
                    )}
                    {row.entryType === 'COUPON_REDEEM' && row.couponCode && (
                      <p className="text-xs text-muted-foreground">
                        {t('billing.ledgerCoupon', { code: row.couponCode })}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!loggedIn && (
        <Alert>
          <AlertDescription>
            {t('billing.loginHint')}{' '}
            <Link to="/login" className="underline">
              {t('nav.login')}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!balanceOnly && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>
                  {p.kind === 'TOKEN'
                    ? t('billing.productToken', { amount: p.grantAmount })
                    : t('billing.productCount', { amount: p.grantAmount, operation: p.operation })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {p.priceKrw.toLocaleString()}
                  {t('billing.won')}
                </p>
                <Button
                  disabled={!loggedIn || !clientKey || buyMutation.isPending}
                  onClick={() => buyMutation.mutate(p.id)}
                >
                  {t('billing.buy')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wallet && operationCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('billing.costsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              {operationCosts.map((c) => (
                <li key={c.operation}>
                  {c.operation}: {c.tokenCost} {t('billing.tokens')}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
