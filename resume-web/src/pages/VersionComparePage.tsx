import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Columns2, Rows3 } from 'lucide-react';
import { api } from '@/lib/api';
import { countChangedLines, diffText } from '@/lib/text-diff';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { TextDiffView } from '@/components/common/text-diff-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export default function VersionComparePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const versionA = Number(params.get('a') || 1);
  const versionB = Number(params.get('b') || 2);

  const { data: resumes = [] } = useQuery({ queryKey: ['resumes'], queryFn: () => api.listResumes() });
  const resume = resumes.find((r) => r.id === id);

  const { data: versions = [] } = useQuery({
    queryKey: ['resume-versions', id],
    queryFn: () => api.listResumeVersions(id!),
    enabled: !!id,
  });

  const va = versions.find((v) => v.versionNumber === versionA);
  const vb = versions.find((v) => v.versionNumber === versionB);
  const rows = va && vb ? diffText(va.content, vb.content) : [];
  const changed = countChangedLines(rows);

  return (
    <PageShell size="lg">
      <PageBreadcrumb
        items={[
          { label: t('nav.dashboard'), href: '/dashboard' },
          { label: resume?.title ?? t('versionCompare.title') },
        ]}
      />
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
        {rows.length > 0 && (
          <Badge variant="secondary">{t('versionCompare.linesChanged', { count: changed })}</Badge>
        )}
        <div className="ml-auto flex gap-1 rounded-lg border p-1">
          <Button
            type="button"
            variant={viewMode === 'split' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('split')}
          >
            <Columns2 className="size-3.5" />
            {t('versionCompare.splitView')}
          </Button>
          <Button
            type="button"
            variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('unified')}
          >
            <Rows3 className="size-3.5" />
            {t('versionCompare.unifiedView')}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t('versionCompare.needTwo')}</p>
      ) : (
        <TextDiffView
          rows={rows}
          mode={viewMode}
          labelA={t('versionCompare.versionLabel', { version: versionA })}
          labelB={t('versionCompare.versionLabel', { version: versionB })}
        />
      )}
    </PageShell>
  );
}
