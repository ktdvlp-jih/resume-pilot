import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Columns2, Rows3, Trash2 } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SourceType = 'URL' | 'TEXT';
type LayoutMode = 'split' | 'stack';

const LAYOUT_STORAGE_KEY = 'job-postings-layout';

function readLayoutMode(): LayoutMode {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved === 'split' || saved === 'stack') return saved;
  } catch {
    /* ignore */
  }
  return 'split';
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
          <span className="[&:lang(ko)]:break-keep">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function AnalysisPanel({
  analysis,
  emptyTitle,
  sectionsClassName,
  className,
}: {
  analysis: JobAnalysisResponse | null;
  emptyTitle: string;
  sectionsClassName?: string;
  className?: string;
}) {
  const { t } = useTranslation();

  if (!analysis) {
    return <EmptyState title={emptyTitle} className={cn('min-h-56', className)} />;
  }

  const sharedSections = [
    ...(analysis.recruitmentSections && analysis.recruitmentSections.length > 0
      ? []
      : [
          { label: t('jobPostings.jobResponsibilities'), items: analysis.jobResponsibilities },
          { label: t('jobPostings.qualifications'), items: analysis.qualifications },
          { label: t('jobPostings.requiredSkills'), items: analysis.requiredSkills },
          { label: t('jobPostings.preferredSkills'), items: analysis.preferredSkills },
        ]),
    { label: t('jobPostings.workConditions'), items: analysis.workConditions },
    { label: t('jobPostings.benefits'), items: analysis.benefits },
    { label: t('jobPostings.hiringProcess'), items: analysis.hiringProcess },
    { label: t('jobPostings.notes'), items: analysis.notes },
    { label: t('jobPostings.techKeywords'), items: analysis.techKeywords },
    { label: t('jobPostings.solutionKeywords'), items: analysis.solutionKeywords },
    { label: t('jobPostings.talentProfile'), items: analysis.talentProfile },
    { label: t('jobPostings.coreCompetencies'), items: analysis.coreCompetencies },
    { label: t('jobPostings.orgCulture'), items: analysis.orgCulture },
  ];

  return (
    <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('jobPostings.company')}</p>
            <p className="font-medium">{analysis.companyName || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('jobPostings.position')}</p>
            <p className="font-medium">{analysis.position || '—'}</p>
          </div>
        </div>

        {analysis.jobDescription && (
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{t('jobPostings.summary')}</p>
            <p className="text-sm whitespace-pre-wrap text-pretty">{analysis.jobDescription}</p>
          </div>
        )}

        {analysis.recruitmentSections && analysis.recruitmentSections.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('jobPostings.recruitmentSections')}</p>
            <div className={cn('grid gap-3', sectionsClassName)}>
              {analysis.recruitmentSections.map((section) => (
                <div key={section.title} className="space-y-3 rounded-lg border border-border/70 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{section.title}</p>
                    {section.headcount ? (
                      <p className="text-xs text-muted-foreground">
                        {t('jobPostings.headcount')}: {section.headcount}
                      </p>
                    ) : null}
                  </div>
                  {[
                    { label: t('jobPostings.jobResponsibilities'), items: section.jobResponsibilities },
                    { label: t('jobPostings.qualifications'), items: section.qualifications },
                    { label: t('jobPostings.requiredSkills'), items: section.requiredSkills },
                    { label: t('jobPostings.preferredSkills'), items: section.preferredSkills },
                  ].map(({ label, items }) =>
                    items && items.length > 0 ? (
                      <div key={`${section.title}-${label}`}>
                        <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
                        <BulletList items={items} />
                      </div>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {sharedSections.map(({ label, items }) =>
          items && items.length > 0 ? (
            <div key={label}>
              <p className="mb-2 text-sm text-muted-foreground">{label}</p>
              <BulletList items={items} />
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}

export default function JobPostingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [sourceType, setSourceType] = useState<SourceType>('URL');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysisResponse | null>(null);
  const [search, setSearch] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    typeof window === 'undefined' ? 'split' : readLayoutMode(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch {
      /* ignore */
    }
  }, [layoutMode]);

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
      toast.success(t('jobPostings.analyzed'));
    },
    onError: () => toast.error(t('common.error')),
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
    mutationFn: ({ file, title: fileTitle }: { file: File; title?: string }) =>
      api.uploadJobPostingFile(file, fileTitle),
    onSuccess: async (posting) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setSelectedId(posting.id);
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
      toast.success(t('jobPostings.analyzed'));
    },
    onError: () => toast.error(t('common.error')),
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
      company: (a: JobPostingResponse, b: JobPostingResponse) =>
        (a.companyName ?? '').localeCompare(b.companyName ?? ''),
      date: (a: JobPostingResponse, b: JobPostingResponse) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filteredPostings, comparators, 'date');
  const pageSize = layoutMode === 'stack' ? 10 : 8;
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, pageSize);
  const dateLocale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const layoutToggle = (
    <div className="flex gap-1 rounded-lg border p-1">
      <Button
        type="button"
        variant={layoutMode === 'split' ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5"
        aria-pressed={layoutMode === 'split'}
        onClick={() => setLayoutMode('split')}
      >
        <Columns2 className="size-3.5" />
        {t('jobPostings.layoutSplit')}
      </Button>
      <Button
        type="button"
        variant={layoutMode === 'stack' ? 'secondary' : 'ghost'}
        size="sm"
        className="gap-1.5"
        aria-pressed={layoutMode === 'stack'}
        onClick={() => setLayoutMode('stack')}
      >
        <Rows3 className="size-3.5" />
        {t('jobPostings.layoutStack')}
      </Button>
    </div>
  );

  const importCard = (
    <Card>
      <CardHeader>
        <CardTitle>{t('jobPostings.importTitle')}</CardTitle>
        <CardDescription>{t('jobPostings.importDescription')}</CardDescription>
      </CardHeader>
      <form onSubmit={handleUpload}>
        <CardContent className="space-y-4">
          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
            <TabsList>
              <TabsTrigger value="URL">{t('jobPostings.url')}</TabsTrigger>
              <TabsTrigger value="TEXT">{t('jobPostings.textOrFile')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {sourceType === 'URL' ? (
            <div className="space-y-2">
              <Label>{t('jobPostings.urlLabel')}</Label>
              <Input
                type="url"
                data-testid="job-posting-url-input"
                placeholder={t('jobPostings.urlPlaceholder')}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{t('jobPostings.urlHint')}</p>
            </div>
          ) : (
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
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fileUploadMutation.mutate({ file, title: file.name });
                }}
                className="mt-2"
              />
              {fileUploadMutation.isPending && (
                <p className="mt-2 text-sm text-primary">{t('jobPostings.fileAnalyzing')}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('jobPostings.titleOptional')}</Label>
            <Input
              data-testid="job-posting-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <Button type="submit" data-testid="job-posting-upload-btn" disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? t('common.analyzing') : t('jobPostings.uploadAnalyze')}
          </Button>
        </CardContent>
      </form>
    </Card>
  );

  const splitPanel = layoutMode === 'split';

  const savedList = (
    <Section
      title={t('jobPostings.saved')}
      className={cn(splitPanel && 'min-h-0 xl:h-full')}
    >
      {isLoading ? (
        <DataTableCard
          className={cn(splitPanel && 'flex min-h-0 flex-1 flex-col')}
          bodyClassName={cn(splitPanel && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label={t('jobPostings.columns.title')}
                  sortKey="title"
                  activeKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                />
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={4} cols={layoutMode === 'stack' ? 1 : 5} />
          </Table>
        </DataTableCard>
      ) : postings.length === 0 ? (
        <EmptyState title={t('jobPostings.empty')} className={cn(splitPanel && 'min-h-0 flex-1')} />
      ) : (
        <DataTableCard
          className={cn(splitPanel && 'flex min-h-0 flex-1 flex-col')}
          bodyClassName={cn(splitPanel && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}
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
          ) : layoutMode === 'stack' ? (
            <div className="divide-y">
              {paginated.map((p) => {
                const displayTitle = p.title || p.companyName || t('jobPostings.noTitle');
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(p);
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40',
                      selectedId === p.id && 'border-l-2 border-l-primary bg-accent/50',
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-pretty line-clamp-2" title={displayTitle}>
                        {displayTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{p.companyName || '—'}</span>
                        <StatusChip label={p.sourceType} variant="default" />
                        <span>{new Date(p.createdAt).toLocaleDateString(dateLocale)}</span>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={t('common.delete')}>
                            <Trash2 className="size-4" />
                          </Button>
                        }
                        title={t('common.confirmDelete')}
                        description={t('common.confirmDeleteDesc')}
                        confirmLabel={t('common.delete')}
                        cancelLabel={t('common.cancel')}
                        destructive
                        onConfirm={() => deleteMutation.mutate(p.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label={t('jobPostings.columns.title')}
                    sortKey="title"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label={t('jobPostings.columns.company')}
                    sortKey="company"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="hidden lg:table-cell"
                  />
                  <TableHead className="hidden sm:table-cell">{t('jobPostings.columns.source')}</TableHead>
                  <SortableTableHead
                    label={t('jobPostings.columns.date')}
                    sortKey="date"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="hidden xl:table-cell"
                  />
                  <TableHead className="text-right">{t('jobPostings.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p) => {
                  const displayTitle = p.title || p.companyName || t('jobPostings.noTitle');
                  return (
                    <TableRow
                      key={p.id}
                      data-state={selectedId === p.id ? 'selected' : undefined}
                      className={cn('cursor-pointer', selectedId === p.id && 'bg-accent/50')}
                      onClick={() => handleSelect(p)}
                    >
                      <TableCell className="max-w-0 font-medium">
                        <p className="line-clamp-2 text-pretty" title={displayTitle}>
                          {displayTitle}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {p.companyName || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusChip label={p.sourceType} variant="default" />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {new Date(p.createdAt).toLocaleDateString(dateLocale)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="sm">
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}
    </Section>
  );

  return (
    <PageShell size="wide">
      <PageHeader title={t('jobPostings.title')} action={layoutToggle} />

      {importCard}

      {layoutMode === 'split' ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col xl:sticky xl:top-4 xl:h-[calc(100svh-5.5rem)] xl:min-h-96 xl:overflow-hidden">
            {savedList}
          </div>
          <Section
            title={t('jobPostings.analysis')}
            className="min-h-0 xl:sticky xl:top-4 xl:h-[calc(100svh-5.5rem)] xl:min-h-96 xl:overflow-hidden"
          >
            <AnalysisPanel
              analysis={analysis}
              emptyTitle={t('jobPostings.selectOrUpload')}
              sectionsClassName="grid-cols-1"
              className="min-h-0 flex-1"
            />
          </Section>
        </div>
      ) : (
        <div className="space-y-6">
          {savedList}
          <Section title={t('jobPostings.analysis')}>
            <AnalysisPanel
              analysis={analysis}
              emptyTitle={t('jobPostings.selectOrUpload')}
              sectionsClassName="md:grid-cols-2"
            />
          </Section>
        </div>
      )}
    </PageShell>
  );
}
