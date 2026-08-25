import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Columns2, Pencil, Rows3, Share2, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type SourceType = 'URL' | 'TEXT';
type LayoutMode = 'split' | 'stack';
type PostingScope = 'all' | 'mine' | 'shared';

function isOwnedPosting(p?: JobPostingResponse | null) {
  return p?.owned !== false;
}

function instantToDateInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T23:59:59+09:00`).toISOString();
}

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

type AnalysisDraft = {
  companyName: string;
  position: string;
  jobDescription: string;
  jobResponsibilities: string;
  qualifications: string;
  requiredSkills: string;
  preferredSkills: string;
  workConditions: string;
  benefits: string;
  hiringProcess: string;
  notes: string;
  techKeywords: string;
  solutionKeywords: string;
  talentProfile: string;
  coreCompetencies: string;
  orgCulture: string;
  recruitmentSections: Array<{
    title: string;
    headcount: string;
    jobResponsibilities: string;
    qualifications: string;
    requiredSkills: string;
    preferredSkills: string;
  }>;
};

function listToLines(items?: string[] | null) {
  return (items ?? []).join('\n');
}

function linesToList(text: string) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function analysisToDraft(analysis: JobAnalysisResponse): AnalysisDraft {
  return {
    companyName: analysis.companyName ?? '',
    position: analysis.position ?? '',
    jobDescription: analysis.jobDescription ?? '',
    jobResponsibilities: listToLines(analysis.jobResponsibilities),
    qualifications: listToLines(analysis.qualifications),
    requiredSkills: listToLines(analysis.requiredSkills),
    preferredSkills: listToLines(analysis.preferredSkills),
    workConditions: listToLines(analysis.workConditions),
    benefits: listToLines(analysis.benefits),
    hiringProcess: listToLines(analysis.hiringProcess),
    notes: listToLines(analysis.notes),
    techKeywords: listToLines(analysis.techKeywords),
    solutionKeywords: listToLines(analysis.solutionKeywords),
    talentProfile: listToLines(analysis.talentProfile),
    coreCompetencies: listToLines(analysis.coreCompetencies),
    orgCulture: listToLines(analysis.orgCulture),
    recruitmentSections: (analysis.recruitmentSections ?? []).map((section) => ({
      title: section.title ?? '',
      headcount: section.headcount ?? '',
      jobResponsibilities: listToLines(section.jobResponsibilities),
      qualifications: listToLines(section.qualifications),
      requiredSkills: listToLines(section.requiredSkills),
      preferredSkills: listToLines(section.preferredSkills),
    })),
  };
}

function draftToUpdate(draft: AnalysisDraft) {
  return {
    companyName: draft.companyName.trim(),
    position: draft.position.trim(),
    jobDescription: draft.jobDescription.trim(),
    jobResponsibilities: linesToList(draft.jobResponsibilities),
    qualifications: linesToList(draft.qualifications),
    requiredSkills: linesToList(draft.requiredSkills),
    preferredSkills: linesToList(draft.preferredSkills),
    workConditions: linesToList(draft.workConditions),
    benefits: linesToList(draft.benefits),
    hiringProcess: linesToList(draft.hiringProcess),
    notes: linesToList(draft.notes),
    techKeywords: linesToList(draft.techKeywords),
    solutionKeywords: linesToList(draft.solutionKeywords),
    talentProfile: linesToList(draft.talentProfile),
    coreCompetencies: linesToList(draft.coreCompetencies),
    orgCulture: linesToList(draft.orgCulture),
    recruitmentSections: draft.recruitmentSections.map((section) => ({
      title: section.title.trim(),
      headcount: section.headcount.trim() || null,
      jobResponsibilities: linesToList(section.jobResponsibilities),
      qualifications: linesToList(section.qualifications),
      requiredSkills: linesToList(section.requiredSkills),
      preferredSkills: linesToList(section.preferredSkills),
    })),
  };
}

function AnalysisPanel({
  analysis,
  emptyTitle,
  sectionsClassName,
  className,
  editing,
  draft,
  onDraftChange,
}: {
  analysis: JobAnalysisResponse | null;
  emptyTitle: string;
  sectionsClassName?: string;
  className?: string;
  editing?: boolean;
  draft?: AnalysisDraft | null;
  onDraftChange?: (next: AnalysisDraft) => void;
}) {
  const { t } = useTranslation();

  if (!analysis) {
    return <EmptyState title={emptyTitle} className={cn('min-h-56', className)} />;
  }

  const updateDraft = (patch: Partial<AnalysisDraft>) => {
    if (!draft || !onDraftChange) return;
    onDraftChange({ ...draft, ...patch });
  };

  if (editing && draft) {
    const listFields: Array<{ key: keyof AnalysisDraft; label: string }> = [
      { key: 'jobResponsibilities', label: t('jobPostings.jobResponsibilities') },
      { key: 'qualifications', label: t('jobPostings.qualifications') },
      { key: 'requiredSkills', label: t('jobPostings.requiredSkills') },
      { key: 'preferredSkills', label: t('jobPostings.preferredSkills') },
      { key: 'workConditions', label: t('jobPostings.workConditions') },
      { key: 'benefits', label: t('jobPostings.benefits') },
      { key: 'hiringProcess', label: t('jobPostings.hiringProcess') },
      { key: 'notes', label: t('jobPostings.notes') },
      { key: 'techKeywords', label: t('jobPostings.techKeywords') },
      { key: 'solutionKeywords', label: t('jobPostings.solutionKeywords') },
      { key: 'talentProfile', label: t('jobPostings.talentProfile') },
      { key: 'coreCompetencies', label: t('jobPostings.coreCompetencies') },
      { key: 'orgCulture', label: t('jobPostings.orgCulture') },
    ];
    return (
      <Card className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pt-6">
          <p className="text-xs text-muted-foreground">{t('jobPostings.listHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('jobPostings.company')}</Label>
              <Input value={draft.companyName} onChange={(e) => updateDraft({ companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('jobPostings.position')}</Label>
              <Input value={draft.position} onChange={(e) => updateDraft({ position: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('jobPostings.summary')}</Label>
            <Textarea
              value={draft.jobDescription}
              onChange={(e) => updateDraft({ jobDescription: e.target.value })}
              className="min-h-24"
            />
          </div>
          {draft.recruitmentSections.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('jobPostings.recruitmentSections')}</p>
              {draft.recruitmentSections.map((section, index) => (
                <div key={`${section.title}-${index}`} className="space-y-3 rounded-lg border border-border/70 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('jobPostings.columns.title')}</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => {
                          const recruitmentSections = draft.recruitmentSections.map((item, i) =>
                            i === index ? { ...item, title: e.target.value } : item,
                          );
                          updateDraft({ recruitmentSections });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('jobPostings.headcount')}</Label>
                      <Input
                        value={section.headcount}
                        onChange={(e) => {
                          const recruitmentSections = draft.recruitmentSections.map((item, i) =>
                            i === index ? { ...item, headcount: e.target.value } : item,
                          );
                          updateDraft({ recruitmentSections });
                        }}
                      />
                    </div>
                  </div>
                  {(
                    [
                      ['jobResponsibilities', t('jobPostings.jobResponsibilities')],
                      ['qualifications', t('jobPostings.qualifications')],
                      ['requiredSkills', t('jobPostings.requiredSkills')],
                      ['preferredSkills', t('jobPostings.preferredSkills')],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-2">
                      <Label>{label}</Label>
                      <Textarea
                        value={section[field]}
                        onChange={(e) => {
                          const recruitmentSections = draft.recruitmentSections.map((item, i) =>
                            i === index ? { ...item, [field]: e.target.value } : item,
                          );
                          updateDraft({ recruitmentSections });
                        }}
                        className="min-h-20"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {listFields
            .filter((field) => draft.recruitmentSections.length === 0 || !['jobResponsibilities', 'qualifications', 'requiredSkills', 'preferredSkills'].includes(field.key))
            .map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Textarea
                  value={String(draft[field.key] ?? '')}
                  onChange={(e) => updateDraft({ [field.key]: e.target.value })}
                  className="min-h-20"
                />
              </div>
            ))}
        </CardContent>
      </Card>
    );
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysisResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<AnalysisDraft | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<PostingScope>('all');
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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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

  const updateAnalysisMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => api.updateJobAnalysis(id, data),
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      setAnalysis(next);
      setDraft(analysisToDraft(next));
      setEditing(false);
      toast.success(t('jobPostings.analysisUpdated'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const startEdit = (target: JobAnalysisResponse) => {
    setDraft(analysisToDraft(target));
    setEditing(true);
  };

  const deleteMutation = useMutation({
    mutationFn: api.deleteJobPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      if (selectedId) {
        setSelectedId(null);
        setAnalysis(null);
        setEditing(false);
        setDraft(null);
      }
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) => api.setJobPostingShared(id, shared),
    onSuccess: (_, { shared }) => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      toast.success(shared ? t('jobPostings.shareDone') : t('jobPostings.unshareDone'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const closesAtMutation = useMutation({
    mutationFn: ({ id, closesAt }: { id: string; closesAt: string | null }) =>
      api.setJobPostingClosesAt(id, closesAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      toast.success(t('jobPostings.closesAtSaved'));
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
      setContent('');
      setTitle('');
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast.success(t('jobPostings.analyzed'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const requireTitle = () => {
    if (title.trim()) return true;
    toast.error(t('jobPostings.titleRequiredHint'));
    return false;
  };

  const uploadImageFile = (file: File) => {
    if (!requireTitle()) return;
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    fileUploadMutation.mutate({ file, title: title.trim() });
  };

  const imageFileFromClipboard = (data: DataTransfer | null): File | null => {
    if (!data) return null;
    const fromFiles = Array.from(data.files).find((f) => f.type.startsWith('image/'));
    if (fromFiles) return fromFiles;
    for (const item of Array.from(data.items)) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] || 'png';
        return new File([blob], `capture.${ext}`, { type: blob.type });
      }
    }
    return null;
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const file = imageFileFromClipboard(e.clipboardData);
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    uploadImageFile(file);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === 'TEXT' && !requireTitle()) return;
    uploadMutation.mutate({
      sourceType,
      content: sourceType === 'TEXT' ? content : undefined,
      sourceUrl: sourceType === 'URL' ? sourceUrl : undefined,
      title: title.trim() || undefined,
    });
  };

  const handleSelect = async (posting: JobPostingResponse) => {
    setSelectedId(posting.id);
    setEditing(false);
    setDraft(null);
    try {
      setAnalysis(await api.getJobAnalysis(posting.id));
    } catch {
      setAnalysis(null);
    }
  };

  const handleStartEdit = async (posting: JobPostingResponse) => {
    if (!isOwnedPosting(posting)) return;
    setSelectedId(posting.id);
    try {
      const result = await api.getJobAnalysis(posting.id);
      setAnalysis(result);
      startEdit(result);
    } catch {
      setAnalysis(null);
      setEditing(false);
      toast.error(t('common.error'));
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type.includes('pdf') || file.type.startsWith('image/')) {
      if (!requireTitle()) return;
      if (file.type.startsWith('image/')) {
        uploadImageFile(file);
      } else {
        fileUploadMutation.mutate({ file, title: title.trim() });
      }
    } else {
      file.text().then((text) => {
        setSourceType('TEXT');
        setContent(text);
        setTitle(file.name);
      });
    }
  };

  const scopedPostings = useMemo(() => {
    if (scope === 'mine') return postings.filter((p) => isOwnedPosting(p));
    if (scope === 'shared') return postings.filter((p) => p.shared);
    return postings;
  }, [postings, scope]);

  const filteredPostings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedPostings;
    return scopedPostings.filter(
      (p) =>
        (p.title?.toLowerCase().includes(q) ?? false) ||
        (p.companyName?.toLowerCase().includes(q) ?? false) ||
        p.sourceType.toLowerCase().includes(q),
    );
  }, [scopedPostings, search]);

  const comparators = useMemo(
    () => ({
      title: (a: JobPostingResponse, b: JobPostingResponse) =>
        (a.title || a.companyName || '').localeCompare(b.title || b.companyName || ''),
      company: (a: JobPostingResponse, b: JobPostingResponse) =>
        (a.companyName ?? '').localeCompare(b.companyName ?? ''),
      date: (a: JobPostingResponse, b: JobPostingResponse) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      deadline: (a: JobPostingResponse, b: JobPostingResponse) =>
        new Date(a.closesAt ?? 0).getTime() - new Date(b.closesAt ?? 0).getTime(),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filteredPostings, comparators, 'date');
  const pageSize = layoutMode === 'stack' ? 10 : 8;
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, pageSize);
  const dateLocale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';
  const selectedPosting = postings.find((p) => p.id === selectedId);
  const canMutateSelected = isOwnedPosting(selectedPosting);

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

          {sourceType === 'TEXT' && (
            <div className="space-y-2">
              <Label>{t('jobPostings.titleRequired')}</Label>
              <Input
                data-testid="job-posting-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={t('jobPostings.titleRequiredPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('jobPostings.titleRequiredHint')}</p>
            </div>
          )}

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
              onPaste={handleImagePaste}
              className="rounded-lg border border-dashed p-4"
            >
              <Textarea
                data-testid="job-posting-content-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handleImagePaste}
                placeholder={t('jobPostings.contentPlaceholder')}
                className="min-h-40"
                required={!imagePreviewUrl}
              />
              <p className="mt-2 text-xs text-muted-foreground">{t('jobPostings.pasteHint')}</p>
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt={t('jobPostings.pastePreviewAlt')}
                  className="mt-2 max-h-40 rounded-md border object-contain"
                />
              )}
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type.startsWith('image/')) {
                    uploadImageFile(file);
                  } else if (file.type.includes('pdf')) {
                    if (!requireTitle()) return;
                    fileUploadMutation.mutate({ file, title: title.trim() });
                  } else {
                    file.text().then((text) => {
                      setContent(text);
                      setTitle(file.name);
                    });
                  }
                }}
                className="mt-2"
              />
              {fileUploadMutation.isPending && (
                <p className="mt-2 text-sm text-primary">{t('jobPostings.fileAnalyzing')}</p>
              )}
            </div>
          )}

          {sourceType === 'URL' && (
            <div className="space-y-2">
              <Label>{t('jobPostings.titleOptional')}</Label>
              <Input
                data-testid="job-posting-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          )}
        </CardContent>
        <CardContent className="pt-0">
          <Button
            type="submit"
            data-testid="job-posting-upload-btn"
            disabled={uploadMutation.isPending || fileUploadMutation.isPending}
          >
            {uploadMutation.isPending || fileUploadMutation.isPending
              ? t('common.analyzing')
              : t('jobPostings.uploadAnalyze')}
          </Button>
        </CardContent>
      </form>
    </Card>
  );

  const splitPanel = layoutMode === 'split';

  const analysisActions = analysis ? (
    editing ? (
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={updateAnalysisMutation.isPending || !draft}
          onClick={() => {
            if (!selectedId || !draft) return;
            updateAnalysisMutation.mutate({ id: selectedId, data: draftToUpdate(draft) });
          }}
        >
          {t('common.save')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={updateAnalysisMutation.isPending}
          onClick={() => {
            setEditing(false);
            setDraft(null);
          }}
        >
          {t('common.cancel')}
        </Button>
      </div>
    ) : canMutateSelected ? (
      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(analysis)}>
        <Pencil className="size-3.5" />
        {t('jobPostings.editAnalysis')}
      </Button>
    ) : (
      <Button size="sm" asChild>
        <Link to={`/workspace?postingId=${selectedId}`}>{t('jobPostings.useInWorkspace')}</Link>
      </Button>
    )
  ) : null;

  const postingActions = (p: JobPostingResponse, compact: boolean) => {
    const owned = isOwnedPosting(p);
    return (
      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {p.shared && (
          <Badge variant="secondary" className="shrink-0">
            {t('jobPostings.sharedBadge')}
          </Badge>
        )}
        {owned ? (
          <>
            <Button
              variant="ghost"
              size={compact ? 'icon-sm' : 'sm'}
              aria-label={p.shared ? t('jobPostings.unshare') : t('jobPostings.share')}
              disabled={shareMutation.isPending}
              onClick={() => shareMutation.mutate({ id: p.id, shared: !p.shared })}
            >
              {compact ? <Share2 className="size-4" /> : p.shared ? t('jobPostings.unshare') : t('jobPostings.share')}
            </Button>
            <Button
              variant="ghost"
              size={compact ? 'icon-sm' : 'sm'}
              aria-label={t('common.edit')}
              onClick={() => handleStartEdit(p)}
            >
              {compact ? <Pencil className="size-4" /> : t('common.edit')}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size={compact ? 'icon-sm' : 'sm'} aria-label={t('common.delete')}>
                  {compact ? <Trash2 className="size-4" /> : t('common.delete')}
                </Button>
              }
              title={t('common.confirmDelete')}
              description={t('common.confirmDeleteDesc')}
              confirmLabel={t('common.delete')}
              cancelLabel={t('common.cancel')}
              destructive
              onConfirm={() => deleteMutation.mutate(p.id)}
            />
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/workspace?postingId=${p.id}`}>{t('jobPostings.useInWorkspace')}</Link>
          </Button>
        )}
      </div>
    );
  };

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
          toolbar={
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-1 rounded-lg border p-1">
                {(['all', 'mine', 'shared'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={scope === value ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={scope === value}
                    onClick={() => setScope(value)}
                  >
                    {t(
                      value === 'all'
                        ? 'jobPostings.filterAll'
                        : value === 'mine'
                          ? 'jobPostings.filterMine'
                          : 'jobPostings.filterShared',
                    )}
                  </Button>
                ))}
              </div>
              <SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />
            </div>
          }
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
                        {p.closesAt && (
                          <span>
                            {t('jobPostings.deadline')}: {new Date(p.closesAt).toLocaleDateString(dateLocale)}
                          </span>
                        )}
                      </div>
                    </div>
                    {postingActions(p, true)}
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
                  <SortableTableHead
                    label={t('jobPostings.columns.deadline')}
                    sortKey="deadline"
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
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {p.closesAt ? new Date(p.closesAt).toLocaleDateString(dateLocale) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{postingActions(p, false)}</TableCell>
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
    <PageShell>
      <PageHeader title={t('jobPostings.title')} action={layoutToggle} />

      {importCard}

      {layoutMode === 'split' ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col xl:sticky xl:top-4 xl:h-[calc(100svh-5.5rem)] xl:min-h-96 xl:overflow-hidden">
            {savedList}
          </div>
          <Section
            title={t('jobPostings.analysis')}
            description={!canMutateSelected && selectedPosting?.shared ? t('jobPostings.readOnlyHint') : undefined}
            action={analysisActions}
            className="min-h-0 xl:sticky xl:top-4 xl:h-[calc(100svh-5.5rem)] xl:min-h-96 xl:overflow-hidden"
          >
            {canMutateSelected && selectedPosting && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label htmlFor="job-closes-at">{t('jobPostings.deadline')}</Label>
                <Input
                  id="job-closes-at"
                  type="date"
                  className="w-auto"
                  value={instantToDateInput(selectedPosting.closesAt)}
                  disabled={closesAtMutation.isPending}
                  onChange={(e) =>
                    closesAtMutation.mutate({
                      id: selectedPosting.id,
                      closesAt: dateInputToIso(e.target.value),
                    })
                  }
                />
              </div>
            )}
            <AnalysisPanel
              analysis={analysis}
              emptyTitle={t('jobPostings.selectOrUpload')}
              sectionsClassName="grid-cols-1"
              className="min-h-0 flex-1"
              editing={editing}
              draft={draft}
              onDraftChange={setDraft}
            />
          </Section>
        </div>
      ) : (
        <div className="space-y-6">
          {savedList}
          <Section
            title={t('jobPostings.analysis')}
            description={!canMutateSelected && selectedPosting?.shared ? t('jobPostings.readOnlyHint') : undefined}
            action={analysisActions}
          >
            {canMutateSelected && selectedPosting && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Label htmlFor="job-closes-at-stack">{t('jobPostings.deadline')}</Label>
                <Input
                  id="job-closes-at-stack"
                  type="date"
                  className="w-auto"
                  value={instantToDateInput(selectedPosting.closesAt)}
                  disabled={closesAtMutation.isPending}
                  onChange={(e) =>
                    closesAtMutation.mutate({
                      id: selectedPosting.id,
                      closesAt: dateInputToIso(e.target.value),
                    })
                  }
                />
              </div>
            )}
            <AnalysisPanel
              analysis={analysis}
              emptyTitle={t('jobPostings.selectOrUpload')}
              sectionsClassName="md:grid-cols-2"
              editing={editing}
              draft={draft}
              onDraftChange={setDraft}
            />
          </Section>
        </div>
      )}
    </PageShell>
  );
}
