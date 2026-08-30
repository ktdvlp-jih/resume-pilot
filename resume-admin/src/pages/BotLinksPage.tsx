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
    </div>
  );
}
