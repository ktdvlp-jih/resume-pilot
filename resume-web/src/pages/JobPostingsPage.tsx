import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type JobAnalysisResponse, type JobPostingResponse } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type SourceType = 'TEXT' | 'URL';

const tagColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  gray: 'bg-muted text-muted-foreground',
};

export default function JobPostingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<SourceType>('TEXT');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysisResponse | null>(null);

  const { data: postings = [], isLoading } = useQuery({
    queryKey: ['job-postings'],
    queryFn: api.listJobPostings,
  });

  const uploadMutation = useMutation({
    mutationFn: api.uploadJobPosting,
    onSuccess: async (posting) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setSelectedId(posting.id);
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
      setContent('');
      setSourceUrl('');
      setTitle('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteJobPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      if (selectedId) {
        setSelectedId(null);
        setAnalysis(null);
      }
    },
  });

  const fileUploadMutation = useMutation({
    mutationFn: ({ file, title: fileTitle }: { file: File; title?: string }) => api.uploadJobPostingFile(file, fileTitle),
    onSuccess: async (posting) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setSelectedId(posting.id);
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate({
      sourceType,
      content: sourceType === 'TEXT' ? content : undefined,
      sourceUrl: sourceType === 'URL' ? sourceUrl : undefined,
      title: title || undefined,
    });
  };

  const handleSelect = async (posting: JobPostingResponse) => {
    setSelectedId(posting.id);
    try {
      setAnalysis(await api.getJobAnalysis(posting.id));
    } catch {
      setAnalysis(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type.includes('pdf') || file.type.startsWith('image/')) {
      fileUploadMutation.mutate({ file, title: file.name });
    } else {
      file.text().then((text) => {
        setSourceType('TEXT');
        setContent(text);
        setTitle(file.name);
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={t('jobPostings.title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('jobPostings.uploadAnalyze')}</CardTitle>
        </CardHeader>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4">
            <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
              <TabsList>
                <TabsTrigger value="TEXT">{t('jobPostings.textOrFile')}</TabsTrigger>
                <TabsTrigger value="URL">{t('jobPostings.url')}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>{t('jobPostings.titleOptional')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {sourceType === 'TEXT' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="rounded-lg border border-dashed p-4"
              >
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('jobPostings.contentPlaceholder')}
                  className="min-h-40"
                  required
                />
                <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fileUploadMutation.mutate({ file, title: file.name });
                }} className="mt-2" />
                {fileUploadMutation.isPending && (
                  <p className="mt-2 text-sm text-primary">{t('jobPostings.fileAnalyzing')}</p>
                )}
              </div>
            ) : (
              <Input type="url" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} required />
            )}
          </CardContent>
          <CardContent className="pt-0">
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? t('common.analyzing') : t('jobPostings.uploadAnalyze')}
            </Button>
          </CardContent>
        </form>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <h3 className="font-medium">{t('jobPostings.saved')}</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : postings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('jobPostings.empty')}</p>
          ) : (
            <div className="space-y-2">
              {postings.map((p) => (
                <Card
                  key={p.id}
                  size="sm"
                  className={cn('cursor-pointer transition-colors hover:bg-accent/50', selectedId === p.id && 'ring-2 ring-primary')}
                  onClick={() => handleSelect(p)}
                >
                  <CardContent className="flex justify-between gap-2 pt-4">
                    <div>
                      <p className="font-medium">{p.title || p.companyName || t('jobPostings.noTitle')}</p>
                      <p className="text-sm text-primary">{p.companyName}</p>
                      <CardDescription className="mt-1">
                        {p.sourceType} · {new Date(p.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(p.id);
                      }}
                    >
                      {t('common.delete')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-medium">{t('jobPostings.analysis')}</h3>
          {!analysis ? (
            <p className="text-sm text-muted-foreground">{t('jobPostings.selectOrUpload')}</p>
          ) : (
            <Card>
              <CardContent className="space-y-4 pt-6 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('jobPostings.company')}</p>
                  <p className="text-lg font-semibold">{analysis.companyName || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('jobPostings.position')}</p>
                  <p>{analysis.position || '-'}</p>
                </div>
                <TagSection title={t('jobPostings.requiredSkills')} tags={analysis.requiredSkills} color="blue" />
                <TagSection title={t('jobPostings.preferredSkills')} tags={analysis.preferredSkills} color="green" />
                <TagSection title={t('jobPostings.techKeywords')} tags={analysis.techKeywords} color="purple" />
                <TagSection title={t('jobPostings.talentProfile')} tags={analysis.talentProfile} color="orange" />
                <TagSection title={t('jobPostings.coreCompetencies')} tags={analysis.coreCompetencies} color="gray" />
                {analysis.orgCulture && (
                  <div>
                    <p className="text-muted-foreground">{t('jobPostings.orgCulture')}</p>
                    <p>{analysis.orgCulture}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function TagSection({ title, tags, color }: { title: string; tags: string[]; color: string }) {
  if (!tags.length) return null;
  return (
    <div>
      <p className="mb-1 text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span key={tag} className={cn('rounded-md px-2 py-0.5 text-xs', tagColors[color])}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
