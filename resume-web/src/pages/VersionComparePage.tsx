import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function diffLines(a: string, b: string) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const max = Math.max(la.length, lb.length);
  const rows: { a: string; b: string; changed: boolean }[] = [];
  for (let i = 0; i < max; i++) {
    const lineA = la[i] ?? '';
    const lineB = lb[i] ?? '';
    rows.push({ a: lineA, b: lineB, changed: lineA !== lineB });
  }
  return rows;
}

export default function VersionComparePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const versionA = Number(params.get('a') || 1);
  const versionB = Number(params.get('b') || 2);

  const { data: versions = [] } = useQuery({
    queryKey: ['resume-versions', id],
    queryFn: () => api.listResumeVersions(id!),
    enabled: !!id,
  });

  const va = versions.find((v) => v.versionNumber === versionA);
  const vb = versions.find((v) => v.versionNumber === versionB);
  const rows = va && vb ? diffLines(va.content, vb.content) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t('versionCompare.title')} />

      <div className="flex flex-wrap items-center gap-4">
        <Select value={String(versionA)} onValueChange={(v) => setParams({ a: v, b: String(versionB) })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={String(v.versionNumber)}>
                v{v.versionNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">{t('common.vs')}</span>
        <Select value={String(versionB)} onValueChange={(v) => setParams({ a: String(versionA), b: v })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={String(v.versionNumber)}>
                v{v.versionNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t('versionCompare.needTwo')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>v{versionA}</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.map((r, i) => (
                <p key={i} className={cn('py-0.5 text-sm font-mono', r.changed && 'rounded bg-destructive/10')}>
                  {r.a || ' '}
                </p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>v{versionB}</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.map((r, i) => (
                <p key={i} className={cn('py-0.5 text-sm font-mono', r.changed && 'rounded bg-emerald-500/10')}>
                  {r.b || ' '}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
