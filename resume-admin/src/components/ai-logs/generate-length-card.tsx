import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatModelDisplay } from '@/lib/model-labels';

type LengthStats = {
  sampleCount: number;
  unreliableFromChars: number | null;
  unreliableThreshold: number;
  minBucketN: number;
  uiMinChars: number;
  uiMaxChars: number;
  uiDefaultChars: number;
  generateMaxTokens: number;
  buckets: Array<{
    from: number;
    to: number;
    n: number;
    ok: number;
    shortCount: number;
    truncated: number;
    error: number;
    overshoot: number;
    insufficient: number;
    medianOutput: number;
    unreliableRate: number;
  }>;
  recent: Array<{
    createdAt: string;
    model?: string;
    title: string;
    targetChars: number;
    outputChars: number;
    quality: string;
  }>;
};

function qualityVariant(quality: string): 'secondary' | 'destructive' | 'outline' {
  if (quality === 'truncated' || quality === 'error' || quality === 'overshoot') return 'destructive';
  if (quality === 'ok') return 'secondary';
  return 'outline';
}

export function GenerateLengthCard() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-generate-length-stats'],
    queryFn: api.getGenerateLengthStats,
  });
  const stats = data as LengthStats | undefined;
  const dateLocale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('aiLogs.lengthTitle')}</CardTitle>
        <CardDescription>{t('aiLogs.lengthDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isError ? (
          <p className="text-sm text-destructive">{t('aiLogs.lengthLoadFailed')}</p>
        ) : isLoading || !stats ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {t('aiLogs.lengthLimits', {
                min: stats.uiMinChars,
                max: stats.uiMaxChars,
                default: stats.uiDefaultChars,
                tokens: stats.generateMaxTokens,
              })}
            </p>
            <div>
              <p className="text-xs text-muted-foreground">{t('aiLogs.lengthHeadline')}</p>
              {stats.unreliableFromChars != null ? (
                <p className="text-2xl font-semibold tracking-tight">
                  {t('aiLogs.lengthFrom', { chars: stats.unreliableFromChars })}
                </p>
              ) : (
                <p className="text-sm font-medium">{t('aiLogs.lengthNone')}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                {t('aiLogs.lengthRule', {
                  rate: Math.round(stats.unreliableThreshold * 100),
                  n: stats.minBucketN,
                  samples: stats.sampleCount,
                })}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('aiLogs.lengthBucket')}</TableHead>
                  <TableHead className="text-right">{t('aiLogs.lengthN')}</TableHead>
                  <TableHead className="text-right">{t('aiLogs.lengthOk')}</TableHead>
                  <TableHead className="text-right">{t('aiLogs.lengthBad')}</TableHead>
                  <TableHead className="text-right">{t('aiLogs.lengthMedian')}</TableHead>
                  <TableHead className="text-right">{t('aiLogs.lengthFailRate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.buckets.map((b) => (
                  <TableRow key={`${b.from}-${b.to}`}>
                    <TableCell>{t('aiLogs.lengthRange', { from: b.from, to: b.to })}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.n}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.ok + b.shortCount + b.insufficient}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.truncated + b.error + b.overshoot}</TableCell>
                    <TableCell className="text-right tabular-nums">{b.n ? b.medianOutput : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.n ? `${Math.round(b.unreliableRate * 100)}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {stats.recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{t('aiLogs.lengthRecent')}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('aiLogs.time')}</TableHead>
                      <TableHead>{t('aiLogs.lengthTitleCol')}</TableHead>
                      <TableHead className="text-right">{t('aiLogs.lengthTarget')}</TableHead>
                      <TableHead className="text-right">{t('aiLogs.lengthOutput')}</TableHead>
                      <TableHead>{t('aiLogs.lengthQuality')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recent.map((row, i) => (
                      <TableRow key={`${row.createdAt}-${row.title}-${i}`}>
                        <TableCell className="text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString(dateLocale)}
                        </TableCell>
                        <TableCell className="max-w-40 truncate" title={row.title}>
                          {row.title || '—'}
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={formatModelDisplay(row.model)}>
                            {formatModelDisplay(row.model)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.targetChars}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.outputChars}</TableCell>
                        <TableCell>
                          <Badge variant={qualityVariant(row.quality)}>
                            {t(`aiLogs.quality.${row.quality}`, { defaultValue: row.quality })}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
