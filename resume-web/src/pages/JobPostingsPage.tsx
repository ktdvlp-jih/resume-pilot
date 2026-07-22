import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type JobAnalysisResponse, type JobPostingResponse } from '@/lib/api';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
import { Section } from '@/components/common/section';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { StatusChip } from '@/components/common/status-chip';
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SourceType = 'TEXT' | 'URL';

const tagColors: Record<string, string> = {
  blue: 'bg-tag-blue/12 text-tag-blue',
  green: 'bg-tag-green/12 text-tag-green',
  purple: 'bg-tag-purple/12 text-tag-purple',
  orange: 'bg-tag-orange/12 text-tag-orange',
  amber: 'bg-tag-amber/12 text-tag-amber',
  slate: 'bg-tag-slate/12 text-tag-slate',
  teal: 'bg-tag-teal/12 text-tag-teal',
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
  const [search, setSearch] = useState('');

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
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
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

  const filteredPostings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return postings;
    return postings.filter(
      (p) =>
        (p.title?.toLowerCase().includes(q) ?? false) ||
        (p.companyName?.toLowerCase().includes(q) ?? false) ||
        p.sourceType.toLowerCase().includes(q),
    );
  }, [postings, search]);

  const comparators = useMemo(
    () => ({
      title: (a: JobPostingResponse, b: JobPostingResponse) =>
        (a.title || a.companyName || '').localeCompare(b.title || b.companyName || ''),
      company: (a: JobPostingResponse, b: JobPostingResponse) => (a.companyName ?? '').localeCompare(b.companyName ?? ''),
      date: (a: JobPostingResponse, b: JobPostingResponse) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filteredPostings, comparators, 'date');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 8);

  return (
    <PageShell size="lg">
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
              <Input data-testid="job-posting-title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {sourceType === 'TEXT' ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="rounded-lg border border-dashed p-4"
              >
                <Textarea
                  data-testid="job-posting-content-input"
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
            <Button type="submit" data-testid="job-posting-upload-btn" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? t('common.analyzing') : t('jobPostings.uploadAnalyze')}
            </Button>
          </CardContent>
        </form>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title={t('jobPostings.saved')}>
          {isLoading ? (
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label={t('jobPostings.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableSkeletonRows rows={4} cols={5} />
              </Table>
            </DataTableCard>
          ) : postings.length === 0 ? (
            <EmptyState title={t('jobPostings.empty')} />
          ) : (
            <DataTableCard
              toolbar={<SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />}
              footer={
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  from={from}
                  to={to}
                  total={total}
                  onPageChange={setPage}
                  className="w-full"
                />
              }
            >
              {paginated.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label={t('jobPostings.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                      <SortableTableHead label={t('jobPostings.columns.company')} sortKey="company" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden sm:table-cell" />
                      <TableHead>{t('jobPostings.columns.source')}</TableHead>
                      <SortableTableHead label={t('jobPostings.columns.date')} sortKey="date" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden md:table-cell" />
                      <TableHead className="text-right">{t('jobPostings.columns.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((p) => (
                      <TableRow
                        key={p.id}
                        data-state={selectedId === p.id ? 'selected' : undefined}
                        className={cn('cursor-pointer', selectedId === p.id && 'bg-accent/50')}
                        onClick={() => handleSelect(p)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {p.title || p.companyName || t('jobPostings.noTitle')}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {p.companyName || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusChip label={p.sourceType} variant="default" />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t('common.delete')}
                              </Button>
                            }
                            title={t('common.confirmDelete')}
                            description={t('common.confirmDeleteDesc')}
                            confirmLabel={t('common.delete')}
                            cancelLabel={t('common.cancel')}
                            destructive
                            onConfirm={() => deleteMutation.mutate(p.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </DataTableCard>
          )}
        </Section>

        <Section title={t('jobPostings.analysis')}>
          {!analysis ? (
            <EmptyState title={t('jobPostings.selectOrUpload')} className="py-10" />
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
                <TagSection title={t('jobPostings.qualifications')} tags={analysis.qualifications ?? []} color="slate" />
                <TagSection title={t('jobPostings.requiredSkills')} tags={analysis.requiredSkills} color="blue" />
                <TagSection title={t('jobPostings.preferredSkills')} tags={analysis.preferredSkills} color="green" />
                <TagSection title={t('jobPostings.jobResponsibilities')} tags={analysis.jobResponsibilities ?? []} color="amber" />
                <TagSection title={t('jobPostings.techKeywords')} tags={analysis.techKeywords} color="purple" />
                {(analysis.solutionKeywords?.length ?? 0) > 0 && (
                  <TagSection title={t('jobPostings.solutionKeywords')} tags={analysis.solutionKeywords ?? []} color="teal" />
                )}
                <TagSection title={t('jobPostings.talentProfile')} tags={analysis.talentProfile} color="orange" />
                <TagSection title={t('jobPostings.coreCompetencies')} tags={analysis.coreCompetencies} color="gray" />
                {analysis.orgCulture && (
                  <div>
                    <p className="text-muted-foreground">{t('jobPostings.orgCulture')}</p>
                    <p>{analysis.orgCulture}</p>
                  </div>
                )}
                {analysis.jobDescription && (
                  <div>
                    <p className="text-muted-foreground">{t('jobPostings.summary')}</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{analysis.jobDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </Section>
      </div>
    </PageShell>
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
