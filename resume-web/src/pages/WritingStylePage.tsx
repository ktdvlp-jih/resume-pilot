import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Section } from '@/components/common/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export default function WritingStylePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
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
    <PageShell size="md">
      <PageHeader title={t('writingStyle.title')} description={t('writingStyle.description')} />

      {resumesWithContent.length > 0 && (
        <Section title={t('writingStyle.loadSection')} description={t('writingStyle.loadSectionDesc')}>
          <div className="flex flex-wrap gap-2">
            {resumesWithContent.map((r) => (
              <Button key={r.id} variant="outline" size="sm" onClick={() => setContent(r.latestContent!)}>
                {r.title} {t('writingStyle.loadFrom')}
              </Button>
            ))}
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
                {style.frequentWords.length > 0 && (
                  <TagGroup label={t('writingStyle.frequentWords')} items={style.frequentWords} variant="secondary" />
                )}
                {style.connectors.length > 0 && (
                  <TagGroup label={t('writingStyle.connectors')} items={style.connectors} variant="outline" />
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
