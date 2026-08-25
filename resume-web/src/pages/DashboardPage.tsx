import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ResumeExportMenu } from '@/components/resume/resume-export-menu';
import { CareerPortfolioOverview } from '@/components/career/CareerPortfolioOverview';
import { normalizeCareerPortfolio } from '@/lib/career-portfolio';
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
import { useUrlPagination } from '@/hooks/use-url-pagination';
import { useUrlSort } from '@/hooks/use-url-sort';
import { OnboardingGuide } from '@/components/common/onboarding-guide';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const { data: resumes = [], isLoading } = useQuery({ queryKey: ['resumes'], queryFn: () => api.listResumes() });
  const { data: experiences = [] } = useQuery({ queryKey: ['experiences'], queryFn: () => api.listExperiences() });
  const { data: jobPostings = [] } = useQuery({ queryKey: ['job-postings'], queryFn: api.listJobPostings });
  const sharedPostings = useMemo(() => jobPostings.filter((p) => p.shared), [jobPostings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resumes;
    return resumes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.companyName?.toLowerCase().includes(q) ?? false) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [resumes, search]);

  const comparators = useMemo(
    () => ({
      title: (a: (typeof resumes)[0], b: (typeof resumes)[0]) => a.title.localeCompare(b.title),
      company: (a: (typeof resumes)[0], b: (typeof resumes)[0]) =>
        (a.companyName ?? '').localeCompare(b.companyName ?? ''),
      updated: (a: (typeof resumes)[0], b: (typeof resumes)[0]) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'updated');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 8);

  const deleteMutation = useMutation({
    mutationFn: api.deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const portfolio = normalizeCareerPortfolio(user?.careerPortfolio);

  return (
    <PageShell className="space-y-8">
      <OnboardingGuide
        experiencesCount={experiences.length}
        jobPostingsCount={jobPostings.length}
        resumesCount={resumes.length}
      />
      <CareerPortfolioOverview name={user?.name} portfolio={portfolio} />

      {sharedPostings.length > 0 && (
        <Section
          title={t('dashboard.sharedTitle')}
          description={t('dashboard.sharedHint')}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/job-postings">{t('dashboard.viewAllShared')}</Link>
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sharedPostings.slice(0, 6).map((p) => {
              const displayTitle = p.title || p.companyName || t('jobPostings.noTitle');
              return (
                <Card key={p.id} size="sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-pretty">{displayTitle}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        {t('jobPostings.sharedBadge')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{p.companyName || '—'}</p>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" asChild>
                      <Link to={`/workspace?postingId=${p.id}`}>{t('dashboard.usePosting')}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      <PageHeader
        title={t('dashboard.title')}
        action={
          <Button asChild>
            <Link to="/workspace">{t('dashboard.newResume')}</Link>
          </Button>
        }
      />

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label={t('dashboard.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTableHead label={t('dashboard.columns.company')} sortKey="company" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden sm:table-cell" />
                <SortableTableHead label={t('dashboard.columns.updated')} sortKey="updated" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden md:table-cell" />
                <TableHead className="text-right">{t('dashboard.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={5} cols={4} />
          </Table>
        </DataTableCard>
      ) : resumes.length === 0 ? (
        <EmptyState
          title={t('dashboard.empty')}
          action={
            <Button asChild>
              <Link to="/workspace">{t('dashboard.startWorkspace')}</Link>
            </Button>
          }
        />
      ) : (
        <DataTableCard
          toolbar={<SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />}
          footer={
            <PaginationControls page={page} totalPages={totalPages} from={from} to={to} total={total} onPageChange={setPage} className="w-full" />
          }
        >
          {paginated.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('dashboard.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('dashboard.columns.company')} sortKey="company" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden sm:table-cell" />
                  <SortableTableHead label={t('dashboard.columns.updated')} sortKey="updated" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden md:table-cell" />
                  <TableHead className="text-right">{t('dashboard.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 sm:hidden">{r.companyName || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{r.companyName || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground tabular-nums">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/resumes/${r.id}/versions`}>{t('dashboard.versions')}</Link>
                        </Button>
                        <ResumeExportMenu title={r.title} content={r.latestContent} resumeId={r.id} compact />
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="sm" className="text-destructive">{t('common.delete')}</Button>}
                          title={t('common.confirmDelete')}
                          description={t('common.confirmDeleteDesc')}
                          confirmLabel={t('common.delete')}
                          cancelLabel={t('common.cancel')}
                          destructive
                          onConfirm={() => deleteMutation.mutate(r.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataTableCard>
      )}
    </PageShell>
  );
}
