import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function AiLogsPage() {
  const { t, i18n } = useTranslation();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-ai-logs'], queryFn: api.listAiLogs });

  const dateLocale = i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <div className="space-y-4">
      <PageHeader title={t('aiLogs.title')} />
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('aiLogs.time')}</TableHead>
                  <TableHead>{t('aiLogs.service')}</TableHead>
                  <TableHead>{t('aiLogs.operation')}</TableHead>
                  <TableHead>{t('aiLogs.status')}</TableHead>
                  <TableHead>{t('aiLogs.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as Array<{ id: string; service: string; operation: string; status: string; durationMs: number; createdAt: string }>).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-muted-foreground">{new Date(l.createdAt).toLocaleString(dateLocale)}</TableCell>
                    <TableCell>{l.service}</TableCell>
                    <TableCell>{l.operation}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'SUCCESS' ? 'secondary' : 'destructive'}>{l.status}</Badge>
                    </TableCell>
                    <TableCell>{l.durationMs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">{t('aiLogs.empty')}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
