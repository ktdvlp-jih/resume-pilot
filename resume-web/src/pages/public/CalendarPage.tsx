import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PublicPage } from '@/components/layout/public-page';
import { EmptyState } from '@/components/common/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['public-shared-job-postings'],
    queryFn: api.listPublicSharedJobPostings,
  });
  const locale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <PublicPage title={t('calendar.title')} description={t('calendar.desc')} path="/calendar" width="lg">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('calendar.title')}</h1>
        <p className="text-pretty text-muted-foreground">{t('calendar.desc')}</p>
      </header>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
      ) : data.length === 0 ? (
        <EmptyState title={t('calendar.empty')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('calendar.columns.title')}</TableHead>
              <TableHead>{t('calendar.columns.company')}</TableHead>
              <TableHead>{t('calendar.columns.closesAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={`${row.title}-${row.createdAt}-${i}`}>
                <TableCell className="font-medium">{row.title || t('jobPostings.noTitle')}</TableCell>
                <TableCell className="text-muted-foreground">{row.companyName || '—'}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {row.closesAt ? new Date(row.closesAt).toLocaleDateString(locale) : t('calendar.noDeadline')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Button variant="outline" asChild>
        <Link to="/signup">{t('calendar.cta')}</Link>
      </Button>
    </PublicPage>
  );
}
