import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export default function WritingStylePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const { data: style, isLoading } = useQuery({
    queryKey: ['writing-style'],
    queryFn: api.getWritingStyle,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: api.listResumes,
  });

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => api.analyzeWritingStyle(text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['writingStyle'] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('writingStyle.title')} description={t('writingStyle.description')} />

      {resumes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resumes.filter((r) => r.latestContent).map((r) => (
            <Button key={r.id} variant="outline" size="sm" onClick={() => setContent(r.latestContent!)}>
              {r.title} {t('writingStyle.loadFrom')}
            </Button>
          ))}
        </div>
      )}

      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('writingStyle.placeholder')} className="min-h-48" />

      <Button onClick={() => analyzeMutation.mutate(content)} disabled={!content || analyzeMutation.isPending}>
        {analyzeMutation.isPending ? t('common.analyzing') : t('writingStyle.analyze')}
      </Button>

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : style ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('writingStyle.result')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info label={t('writingStyle.sentenceStyle')} value={style.sentenceStyle} />
              <Info label={t('writingStyle.tone')} value={style.tone} />
              <Info label={t('writingStyle.formalSpeech')} value={style.usesFormalSpeech ? t('writingStyle.formalYes') : t('writingStyle.formalMixed')} />
              <Info label={t('writingStyle.avgSentenceLength')} value={style.avgSentenceLength ? `${style.avgSentenceLength}${t('writingStyle.chars')}` : '-'} />
            </div>
            {style.expressionStyle && <p className="text-sm text-muted-foreground">{style.expressionStyle}</p>}
            {style.frequentWords.length > 0 && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">{t('writingStyle.frequentWords')}</p>
                <div className="flex flex-wrap gap-1">
                  {style.frequentWords.map((w) => (
                    <Badge key={w} variant="secondary">{w}</Badge>
                  ))}
                </div>
              </div>
            )}
            {style.connectors.length > 0 && (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">{t('writingStyle.connectors')}</p>
                <div className="flex flex-wrap gap-1">
                  {style.connectors.map((c) => (
                    <Badge key={c} variant="outline">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}
