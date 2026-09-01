import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ROLES = ['Backend', 'Frontend', 'PM', 'Data', 'Design'] as const;
const PROD_ORIGIN = 'https://resume.ggury.com';
const LOCAL_ORIGIN = 'http://localhost:5173';

function roleUrl(origin: string, role: string) {
  return `${origin}/guides/roles?role=${role}`;
}

async function copyText(value: string, copiedLabel: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(copiedLabel);
  } catch {
    toast.error(copiedLabel);
  }
}

function LinkTable({
  origin,
  copyLabel,
}: {
  origin: string;
  copyLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('botLinks.role')}</TableHead>
          <TableHead>{t('botLinks.url')}</TableHead>
          <TableHead className="w-24">{t('botLinks.copy')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROLES.map((role) => {
          const href = roleUrl(origin, role);
          return (
            <TableRow key={`${origin}-${role}`}>
              <TableCell>{t(`botLinks.roleName.${role}`)}</TableCell>
              <TableCell>
                <a href={href} target="_blank" rel="noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
                  {href}
                </a>
              </TableCell>
              <TableCell>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(href, copyLabel)}>
                  {t('botLinks.copy')}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function BotLinksPage() {
  const { t } = useTranslation();
  const copied = t('botLinks.copied');

  const opsEndpoints = [
    { method: 'GET', path: '/api/v1/ops/health', noteKey: 'botLinks.opsHealth' },
    { method: 'GET', path: '/api/v1/ops/wallet?email=', noteKey: 'botLinks.opsWallet' },
    { method: 'POST', path: '/api/v1/ops/grant', noteKey: 'botLinks.opsGrant' },
    { method: 'POST', path: '/api/v1/ops/free-allowance/{email}', noteKey: 'botLinks.opsFree' },
    { method: 'GET', path: '/api/v1/ops/payments/recent', noteKey: 'botLinks.opsPayments' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('botLinks.title')} description={t('botLinks.subtitle')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('botLinks.prodTitle')}</CardTitle>
          <CardDescription>{PROD_ORIGIN}</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkTable origin={PROD_ORIGIN} copyLabel={copied} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('botLinks.localTitle')}</CardTitle>
          <CardDescription>{LOCAL_ORIGIN}</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkTable origin={LOCAL_ORIGIN} copyLabel={copied} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('botLinks.opsTitle')}</CardTitle>
          <CardDescription>{t('botLinks.opsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('botLinks.opsMethod')}</TableHead>
                <TableHead>{t('botLinks.opsPath')}</TableHead>
                <TableHead>{t('botLinks.opsNote')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opsEndpoints.map((row) => (
                <TableRow key={row.path}>
                  <TableCell className="font-mono text-xs">{row.method}</TableCell>
                  <TableCell className="break-all font-mono text-xs">{row.path}</TableCell>
                  <TableCell>{t(row.noteKey)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
