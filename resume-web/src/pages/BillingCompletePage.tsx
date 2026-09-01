import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CONFIRM_KEY_PREFIX = 'rp-payment-confirm:';

export default function BillingCompletePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const paymentKey = params.get('paymentKey') ?? '';
    const orderId = params.get('orderId') ?? '';
    const amountRaw = params.get('amount') ?? '';
    const amount = Number(amountRaw);

    if (!paymentKey || !orderId || !Number.isFinite(amount)) {
      setStatus('error');
      setMessage(t('billing.completeInvalid'));
      return;
    }

    const lockKey = CONFIRM_KEY_PREFIX + orderId;
    if (sessionStorage.getItem(lockKey) === 'done') {
      setStatus('ok');
      setMessage(t('billing.completeAlready'));
      return;
    }
    sessionStorage.setItem(lockKey, 'pending');

    api
      .confirmPayment({ paymentKey, orderId, amount })
      .then(() => {
        sessionStorage.setItem(lockKey, 'done');
        queryClient.invalidateQueries({ queryKey: ['billing-wallet'] });
        setStatus('ok');
        setMessage(t('billing.completeOk'));
      })
      .catch((err) => {
        sessionStorage.removeItem(lockKey);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : t('billing.completeError'));
      });
  }, [params, queryClient, t]);

  return (
    <PageShell>
      <PageHeader title={t('billing.completeTitle')} />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">
            {status === 'pending' ? t('billing.completePending') : message}
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/settings?tab=billing">{t('billing.back')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">{t('nav.dashboard')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
