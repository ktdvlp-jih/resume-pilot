import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { asArray } from '@/lib/query-utils';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Section } from '@/components/common/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatHistoryDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function WritingStylePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [showSaved, setShowSaved] = useState(false);

  const { data: style, isLoading } = useQuery({
    queryKey: ['writing-style'],
    queryFn: api.getWritingStyle,
    enabled: showSaved,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.listResumes(),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['resume-versions', selectedResumeId],
    queryFn: () => api.listResumeVersions(selectedResumeId),
    enabled: !!selectedResumeId,
  });

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => api.analyzeWritingStyle(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writing-style'] });
      setContent('');
      setShowSaved(true);
    },
  });

  const resumesWithContent = resumes.filter((r) => r.latestContent);

  return (
    <PageShell>
      <PageHeader title={t('writingStyle.title')} description={t('writingStyle.description')} />

      {resumesWithContent.length > 0 && (
        <Section title={t('writingStyle.loadSection')} description={t('writingStyle.loadSectionDesc')}>
          <div className="flex max-w-xl flex-col gap-2">
            <Select
              value={selectedResumeId || undefined}
              onValueChange={(id) => {
                const resume = resumesWithContent.find((r) => r.id === id);
                setSelectedResumeId(id);
                setSelectedVersionId('');
                if (resume?.latestContent) setContent(resume.latestContent);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('writingStyle.loadPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {resumesWithContent.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {[r.companyName, r.title].filter(Boolean).join(' · ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedResumeId && versions.length > 1 && (
              <Select
                value={selectedVersionId || versions[0]?.id}
                onValueChange={(id) => {
                  const version = versions.find((v) => v.id === id);
                  setSelectedVersionId(id);
                  if (version?.content) setContent(version.content);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('writingStyle.loadVersionPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => {
                    const date = formatHistoryDate(v.createdAt, i18n.language);
                    const named = v.name?.trim()
                      || (typeof v.metadata?.name === 'string' ? v.metadata.name.trim() : '');
                    return (
                      <SelectItem key={v.id} value={v.id}>
                        {named || t('writingStyle.historyVersion', { n: v.versionNumber, date })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </Section>
      )}

      <Section title={t('writingStyle.inputSection')} description={t('writingStyle.inputSectionDesc')}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('writingStyle.placeholder')}
          className="min-h-48 resize-y"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => analyzeMutation.mutate(content)} disabled={!content || analyzeMutation.isPending}>
            {analyzeMutation.isPending ? t('common.analyzing') : t('writingStyle.analyze')}
          </Button>
          <Button variant="outline" onClick={() => setShowSaved((v) => !v)}>
            {showSaved ? t('writingStyle.hideSaved') : t('writingStyle.viewSaved')}
          </Button>
        </div>
      </Section>

      {showSaved && (
        <Section title={t('writingStyle.result')} description={t('writingStyle.resultDesc')}>
          {isLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : style ? (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label={t('writingStyle.sentenceStyle')} value={style.sentenceStyle} />
                  <Info label={t('writingStyle.tone')} value={style.tone} />
                  <Info
                    label={t('writingStyle.formalSpeech')}
                    value={style.usesFormalSpeech ? t('writingStyle.formalYes') : t('writingStyle.formalMixed')}
                  />
                  <Info
                    label={t('writingStyle.avgSentenceLength')}
                    value={style.avgSentenceLength ? `${style.avgSentenceLength}${t('writingStyle.chars')}` : '-'}
                  />
                </div>
                {style.expressionStyle && (
                  <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">{style.expressionStyle}</p>
                )}
                {asArray(style.frequentWords).length > 0 && (
                  <TagGroup label={t('writingStyle.frequentWords')} items={asArray(style.frequentWords)} variant="secondary" />
                )}
                {asArray(style.connectors).length > 0 && (
                  <TagGroup label={t('writingStyle.connectors')} items={asArray(style.connectors)} variant="outline" />
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">{t('writingStyle.historyEmpty')}</p>
          )}
        </Section>
      )}
    </PageShell>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || '-'}</p>
    </div>
  );
}

function TagGroup({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: 'secondary' | 'outline';
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((w) => (
          <Badge key={w} variant={variant}>
            {w}
          </Badge>
        ))}
      </div>
    </div>
  );
}
