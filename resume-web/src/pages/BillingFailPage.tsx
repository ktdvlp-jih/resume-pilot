import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BillingFailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const message = params.get('message') ?? t('billing.failDefault');

  return (
    <PageShell>
      <PageHeader title={t('billing.failTitle')} />
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm text-muted-foreground">{message}</p>
          {code && <p className="font-mono text-xs text-muted-foreground">{code}</p>}
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
