import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { SearchBar } from '@/components/common/search-bar';
import { DataTableCard } from '@/components/common/data-table-card';
import { PaginationControls } from '@/components/common/pagination-controls';
import { SortableTableHead } from '@/components/common/sortable-table-head';
import { TableSkeletonRows } from '@/components/common/table-skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SourceType = 'URL' | 'TEXT';

type AdminJobPosting = {
  id: string;
  title?: string;
  position?: string;
  closesAt?: string | null;
  sourceType: string;
  sourceUrl?: string;
  companyName?: string;
  shared: boolean;
  ownerEmail?: string;
  createdAt: string;
};

const CUSTOM_POSITION = '__custom__';

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T23:59:59+09:00`).toISOString();
}

export default function JobPostingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('URL');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [content, setContent] = useState('');
  const [positionSelect, setPositionSelect] = useState('');
  const [positionCustom, setPositionCustom] = useState('');
  const [closesOn, setClosesOn] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-job-postings'],
    queryFn: api.listJobPostings,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skill-catalog-public'],
    queryFn: api.listSkillCatalogPublic,
  });

  const roleOptions = useMemo(() => {
    const fromCatalog = (skills as Array<{ category: string }>).map((s) => s.category);
    return Array.from(new Set([...fromCatalog, 'PM'])).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [skills]);

  const position =
    positionSelect === CUSTOM_POSITION ? positionCustom.trim() : positionSelect.trim();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        (p.title?.toLowerCase().includes(q) ?? false) ||
        (p.position?.toLowerCase().includes(q) ?? false) ||
        (p.companyName?.toLowerCase().includes(q) ?? false) ||
        (p.ownerEmail?.toLowerCase().includes(q) ?? false),
    );
  }, [data, search]);

  const comparators = useMemo(
    () => ({
      title: (a: AdminJobPosting, b: AdminJobPosting) =>
        (a.title || a.companyName || '').localeCompare(b.title || b.companyName || ''),
      company: (a: AdminJobPosting, b: AdminJobPosting) =>
        (a.companyName ?? '').localeCompare(b.companyName ?? ''),
      owner: (a: AdminJobPosting, b: AdminJobPosting) =>
        (a.ownerEmail ?? '').localeCompare(b.ownerEmail ?? ''),
      closesAt: (a: AdminJobPosting, b: AdminJobPosting) =>
        new Date(a.closesAt ?? 0).getTime() - new Date(b.closesAt ?? 0).getTime(),
      date: (a: AdminJobPosting, b: AdminJobPosting) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'date');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 20);
  const dateLocale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-job-postings'] });

  const uploadMutation = useMutation({
    mutationFn: () =>
      api.uploadSharedJobPosting({
        sourceType,
        title: title.trim(),
        position,
        closesAt: dateInputToIso(closesOn)!,
        sourceUrl: sourceType === 'URL' ? sourceUrl.trim() : undefined,
        content: sourceType === 'TEXT' ? content : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setTitle('');
      setSourceUrl('');
      setContent('');
      setPositionSelect('');
      setPositionCustom('');
      setClosesOn('');
      toast.success(t('jobPostings.uploaded'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) => api.setJobPostingShared(id, shared),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteJobPosting(id),
    onSuccess: () => {
      invalidate();
      toast.success(t('common.deleted'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const canUpload =
    title.trim().length > 0 &&
    position.length > 0 &&
    closesOn.length > 0 &&
    (sourceType === 'URL' ? sourceUrl.trim().length > 0 : content.trim().length > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t('jobPostings.title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('jobPostings.uploadTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('jobPostings.uploadHint')}</p>
          <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
            <TabsList>
              <TabsTrigger value="URL">{t('jobPostings.url')}</TabsTrigger>
              <TabsTrigger value="TEXT">{t('jobPostings.text')}</TabsTrigger>
            </TabsList>
          </Tabs>
          {sourceType === 'URL' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="job-source-url">{t('jobPostings.urlLabel')}</Label>
              <Input
                id="job-source-url"
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.saramin.co.kr/..."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="job-source-text">{t('jobPostings.content')}</Label>
              <Textarea
                id="job-source-text"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-32"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-title">{t('jobPostings.titleRequired')}</Label>
            <Input id="job-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('jobPostings.position')}</Label>
            <Select
              value={positionSelect || undefined}
              onValueChange={(v) => {
                setPositionSelect(v);
                if (v !== CUSTOM_POSITION) setPositionCustom('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('jobPostings.positionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_POSITION}>{t('jobPostings.positionCustom')}</SelectItem>
              </SelectContent>
            </Select>
            {positionSelect === CUSTOM_POSITION && (
              <Input
                value={positionCustom}
                onChange={(e) => setPositionCustom(e.target.value)}
                placeholder={t('jobPostings.positionCustomPlaceholder')}
                required
              />
            )}
            <p className="text-xs text-muted-foreground">{t('jobPostings.positionHint')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="job-closes-at">{t('jobPostings.closesAt')}</Label>
            <Input
              id="job-closes-at"
              type="date"
              required
              value={closesOn}
              onChange={(e) => setClosesOn(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('jobPostings.closesAtHint')}</p>
          </div>
          <Button
            disabled={!canUpload || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? t('common.analyzing') : t('jobPostings.upload')}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('jobPostings.columns.title')}</TableHead>
                <TableHead>{t('jobPostings.columns.position')}</TableHead>
                <TableHead>{t('jobPostings.columns.company')}</TableHead>
                <TableHead>{t('jobPostings.columns.closesAt')}</TableHead>
                <TableHead>{t('jobPostings.columns.owner')}</TableHead>
                <TableHead>{t('jobPostings.columns.shared')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={6} cols={7} />
          </Table>
        </DataTableCard>
      ) : data.length === 0 ? (
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
                  <SortableTableHead
                    label={t('jobPostings.columns.title')}
                    sortKey="title"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <TableHead>{t('jobPostings.columns.position')}</TableHead>
                  <SortableTableHead
                    label={t('jobPostings.columns.company')}
                    sortKey="company"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="hidden md:table-cell"
                  />
                  <SortableTableHead
                    label={t('jobPostings.columns.closesAt')}
                    sortKey="closesAt"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                  />
                  <SortableTableHead
                    label={t('jobPostings.columns.owner')}
                    sortKey="owner"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="hidden lg:table-cell"
                  />
                  <TableHead>{t('jobPostings.columns.shared')}</TableHead>
                  <SortableTableHead
                    label={t('jobPostings.columns.date')}
                    sortKey="date"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={toggleSort}
                    className="hidden xl:table-cell"
                  />
                  <TableHead className="text-right">{t('common.delete')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title || t('jobPostings.noTitle')}</TableCell>
                    <TableCell className="text-muted-foreground">{p.position || '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {p.companyName || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.closesAt ? new Date(p.closesAt).toLocaleDateString(dateLocale) : t('jobPostings.noDeadline')}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {p.ownerEmail || '—'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.shared}
                        disabled={shareMutation.isPending}
                        onCheckedChange={(shared) => shareMutation.mutate({ id: p.id, shared })}
                        aria-label={t('jobPostings.columns.shared')}
                      />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      {new Date(p.createdAt).toLocaleDateString(dateLocale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}
    </div>
  );
}
