import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { api } from '@/lib/api';
import { EXPERIENCE_TYPES } from '@/i18n';
import {
  EXPERIENCE_FIELD_LIMITS,
  MAX_LIBRARY_EXPERIENCES,
  experienceReadiness,
} from '@/lib/experience-limits';
import { PageHeader } from '@/components/common/page-header';
import { PageShell } from '@/components/common/page-shell';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type ExperienceForm = {
  type: string;
  title: string;
  description: string;
  role: string;
  result: string;
  contribution: string;
  numericResult: string;
  starSituation: string;
  starTask: string;
  starAction: string;
  starResult: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
};

const emptyForm = (): ExperienceForm => ({
  type: 'PROJECT',
  title: '',
  description: '',
  role: '',
  result: '',
  contribution: '',
  numericResult: '',
  starSituation: '',
  starTask: '',
  starAction: '',
  starResult: '',
  startDate: '',
  endDate: '',
  ongoing: false,
});

function formatLocalDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}. ${m}. ${d}.`;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const over = len > max;
  return (
    <span className={`text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
      {len}/{max}
    </span>
  );
}

export default function ExperiencesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStar, setShowStar] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [form, setForm] = useState<ExperienceForm>(emptyForm);

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => api.listExperiences(),
  });

  const atLibraryLimit = experiences.length >= MAX_LIBRARY_EXPERIENCES;
  const readyCount = experiences.filter((e) => experienceReadiness(e) === 'ready').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return experiences.filter((exp) => {
      if (typeFilter !== 'ALL' && exp.type !== typeFilter) return false;
      if (!q) return true;
      return (
        exp.title.toLowerCase().includes(q) ||
        (exp.description?.toLowerCase().includes(q) ?? false) ||
        (exp.role?.toLowerCase().includes(q) ?? false) ||
        t(`experienceType.${exp.type}`, { defaultValue: exp.type }).toLowerCase().includes(q)
      );
    });
  }, [experiences, search, typeFilter, t]);

  const comparators = useMemo(
    () => ({
      type: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => a.type.localeCompare(b.type),
      title: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => a.title.localeCompare(b.title),
      role: (a: (typeof experiences)[0], b: (typeof experiences)[0]) => (a.role ?? '').localeCompare(b.role ?? ''),
    }),
    [],
  );

  const { sorted, sortKey, direction, toggleSort } = useUrlSort(filtered, comparators, 'title');
  const { page, setPage, totalPages, paginated, from, to, total } = useUrlPagination(sorted, 10);

  const payloadFromForm = () => ({
    type: form.type,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    role: form.role.trim() || undefined,
    result: form.result.trim() || undefined,
    contribution: form.contribution.trim() || undefined,
    numericResult: form.numericResult.trim() || undefined,
    starSituation: form.starSituation.trim() || undefined,
    starTask: form.starTask.trim() || undefined,
    starAction: form.starAction.trim() || undefined,
    starResult: form.starResult.trim() || undefined,
    startDate: form.startDate || undefined,
    endDate: form.ongoing ? undefined : form.endDate || undefined,
    ongoing: form.ongoing,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createExperience(payloadFromForm()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeForm();
      toast.success(t('common.saved'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => api.updateExperience(id, payloadFromForm()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeForm();
      toast.success(t('common.saved'));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExperience,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      toast.success(t('common.deleted'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const reembedMutation = useMutation({
    mutationFn: () => api.reembedAllExperiences(),
    onSuccess: (res) => {
      try {
        sessionStorage.setItem('rp-exp-embed-v2', '1');
      } catch {
        /* ignore */
      }
      toast.success(t('experiences.reembedDone', { count: res.count }));
    },
    onError: () => toast.error(t('experiences.reembedFailed')),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setShowStar(false);
    setForm(emptyForm());
  };

  const openCreate = () => {
    if (atLibraryLimit) {
      toast.error(t('experiences.limitReached', { max: MAX_LIBRARY_EXPERIENCES }));
      return;
    }
    setEditingId(null);
    setForm(emptyForm());
    setShowStar(false);
    setShowForm(true);
  };

  const startEdit = (exp: (typeof experiences)[0]) => {
    setForm({
      type: exp.type,
      title: exp.title,
      description: exp.description ?? '',
      role: exp.role ?? '',
      result: exp.result ?? '',
      contribution: exp.contribution ?? '',
      numericResult: exp.numericResult ?? '',
      starSituation: exp.starSituation ?? '',
      starTask: exp.starTask ?? '',
      starAction: exp.starAction ?? '',
      starResult: exp.starResult ?? '',
      startDate: exp.startDate ?? '',
      endDate: exp.endDate ?? '',
      ongoing: !exp.endDate,
    });
    setShowStar(Boolean(exp.starSituation || exp.starTask || exp.starAction || exp.starResult));
    setEditingId(exp.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formOverLimit =
    form.title.length > EXPERIENCE_FIELD_LIMITS.title ||
    form.description.length > EXPERIENCE_FIELD_LIMITS.description ||
    form.role.length > EXPERIENCE_FIELD_LIMITS.role ||
    form.result.length > EXPERIENCE_FIELD_LIMITS.result ||
    form.contribution.length > EXPERIENCE_FIELD_LIMITS.contribution ||
    form.numericResult.length > EXPERIENCE_FIELD_LIMITS.numericResult ||
    form.starSituation.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starTask.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starAction.length > EXPERIENCE_FIELD_LIMITS.star ||
    form.starResult.length > EXPERIENCE_FIELD_LIMITS.star;

  const draftReadiness = experienceReadiness(form);

  return (
    <PageShell>
      <PageHeader
        title={t('experiences.title')}
        description={t('experiences.pageHint')}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="tabular-nums font-normal">
              {t('experiences.countBadge', {
                count: experiences.length,
                max: MAX_LIBRARY_EXPERIENCES,
              })}
            </Badge>
            <Button
              type="button"
              variant="outline"
              disabled={experiences.length === 0 || reembedMutation.isPending}
              onClick={() => reembedMutation.mutate()}
            >
              {reembedMutation.isPending ? t('common.generating') : t('experiences.reembed')}
            </Button>
            <Button
              variant={showForm ? 'outline' : 'default'}
              data-testid="experience-add-btn"
              disabled={!showForm && atLibraryLimit}
              onClick={() => (showForm ? closeForm() : openCreate())}
            >
              {showForm ? t('common.cancel') : t('experiences.add')}
            </Button>
          </div>
        }
      />

      <Alert className={readyCount === 0 && experiences.length > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-primary/20 bg-primary/5'}>
        <Info className="size-4 text-primary" />
        <AlertDescription className="text-sm space-y-1">
          <p>{t('experiences.guideMain')}</p>
          <p className="text-muted-foreground">{t('experiences.guideSelect')}</p>
          <p className="text-muted-foreground">{t('experiences.guideReady')}</p>
          <p className={readyCount === 0 && experiences.length > 0 ? 'font-medium text-amber-800 dark:text-amber-300' : 'font-medium'}>
            {readyCount === 0 && experiences.length > 0
              ? t('experiences.readySummaryWarn')
              : t('experiences.readySummary', { ready: readyCount, total: experiences.length })}
          </p>
        </AlertDescription>
      </Alert>

      {atLibraryLimit && !showForm ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('experiences.limitReached', { max: MAX_LIBRARY_EXPERIENCES })}
        </p>
      ) : null}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? t('common.edit') : t('experiences.add')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('experiences.formHint')}</p>
            <p className="text-xs text-muted-foreground">{t('experiences.formRequiredForGen')}</p>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formOverLimit || !form.title.trim()) return;
              if (editingId) updateMutation.mutate({ id: editingId });
              else createMutation.mutate();
            }}
          >
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('experiences.readinessLabel')}</span>
                <StatusChip
                  label={t(`experiences.readiness.${draftReadiness}`)}
                  variant={draftReadiness === 'ready' ? 'success' : draftReadiness === 'thin' ? 'warning' : 'default'}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('experiences.typeLabel')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`experienceType.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('experiences.typeHint')}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.titlePlaceholder')}</Label>
                    <CharCount value={form.title} max={EXPERIENCE_FIELD_LIMITS.title} />
                  </div>
                  <Input
                    data-testid="experience-title-input"
                    value={form.title}
                    maxLength={EXPERIENCE_FIELD_LIMITS.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t('experiences.titleExample')}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.rolePlaceholder')}</Label>
                    <CharCount value={form.role} max={EXPERIENCE_FIELD_LIMITS.role} />
                  </div>
                  <Input
                    value={form.role}
                    maxLength={EXPERIENCE_FIELD_LIMITS.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder={t('experiences.roleExample')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('experiences.startDate')}</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('experiences.endDate')}</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      disabled={form.ongoing}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value, ongoing: false })}
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={form.ongoing}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            ongoing: e.target.checked,
                            endDate: e.target.checked ? '' : form.endDate,
                          })
                        }
                        className="size-4 rounded border-input accent-primary"
                      />
                      {t('experiences.ongoing')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.descriptionPlaceholder')}</Label>
                  <CharCount value={form.description} max={EXPERIENCE_FIELD_LIMITS.description} />
                </div>
                <Textarea
                  data-testid="experience-description-input"
                  value={form.description}
                  maxLength={EXPERIENCE_FIELD_LIMITS.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  placeholder={t('experiences.descriptionExample')}
                />
                <p className="text-xs text-muted-foreground">{t('experiences.descriptionHint')}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.resultPlaceholder')}</Label>
                    <CharCount value={form.result} max={EXPERIENCE_FIELD_LIMITS.result} />
                  </div>
                  <Textarea
                    value={form.result}
                    maxLength={EXPERIENCE_FIELD_LIMITS.result}
                    onChange={(e) => setForm({ ...form, result: e.target.value })}
                    rows={3}
                    placeholder={t('experiences.resultExample')}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t('experiences.numericResult')}</Label>
                    <CharCount value={form.numericResult} max={EXPERIENCE_FIELD_LIMITS.numericResult} />
                  </div>
                  <Input
                    value={form.numericResult}
                    maxLength={EXPERIENCE_FIELD_LIMITS.numericResult}
                    onChange={(e) => setForm({ ...form, numericResult: e.target.value })}
                    placeholder={t('experiences.numericResultExample')}
                  />
                  <p className="text-xs text-muted-foreground">{t('experiences.numericResultHint')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('experiences.contribution')}</Label>
                  <CharCount value={form.contribution} max={EXPERIENCE_FIELD_LIMITS.contribution} />
                </div>
                <Textarea
                  value={form.contribution}
                  maxLength={EXPERIENCE_FIELD_LIMITS.contribution}
                  onChange={(e) => setForm({ ...form, contribution: e.target.value })}
                  rows={2}
                  placeholder={t('experiences.contributionExample')}
                />
              </div>

              <div className="rounded-lg border border-dashed border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{t('experiences.starTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('experiences.starHint')}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowStar((v) => !v)}>
                    {showStar ? t('experiences.starHide') : t('experiences.starShow')}
                  </Button>
                </div>
                {showStar ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ['starSituation', 'starSituation'],
                        ['starTask', 'starTask'],
                        ['starAction', 'starAction'],
                        ['starResult', 'starResult'],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>{t(`experiences.${labelKey}`)}</Label>
                          <CharCount value={form[key]} max={EXPERIENCE_FIELD_LIMITS.star} />
                        </div>
                        <Textarea
                          value={form[key]}
                          maxLength={EXPERIENCE_FIELD_LIMITS.star}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  formOverLimit ||
                  !form.title.trim() ||
                  (!editingId && atLibraryLimit)
                }
              >
                {t('common.save')}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm}>
                {t('common.cancel')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoading ? (
        <DataTableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label={t('experiences.columns.type')} sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                <SortableTableHead label={t('experiences.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableSkeletonRows rows={6} cols={6} />
          </Table>
        </DataTableCard>
      ) : experiences.length === 0 ? (
        <EmptyState
          title={t('experiences.empty')}
          description={t('experiences.emptyHint')}
          action={<Button onClick={openCreate}>{t('experiences.add')}</Button>}
        />
      ) : (
        <DataTableCard
          toolbar={
            <>
              <SearchBar value={search} onChange={setSearch} placeholder={t('common.searchPlaceholder')} />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('common.all')}</SelectItem>
                  {EXPERIENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`experienceType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label={t('experiences.columns.type')} sortKey="type" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <SortableTableHead label={t('experiences.columns.title')} sortKey="title" activeKey={sortKey} direction={direction} onSort={toggleSort} />
                  <TableHead className="hidden md:table-cell">{t('experiences.columns.readiness')}</TableHead>
                  <SortableTableHead label={t('experiences.columns.role')} sortKey="role" activeKey={sortKey} direction={direction} onSort={toggleSort} className="hidden lg:table-cell" />
                  <TableHead className="hidden xl:table-cell">{t('experiences.columns.result')}</TableHead>
                  <TableHead className="text-right">{t('experiences.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((exp) => {
                  const readiness = experienceReadiness(exp);
                  return (
                    <TableRow key={exp.id} className="cursor-pointer" onClick={() => startEdit(exp)}>
                      <TableCell>
                        <StatusChip label={t(`experienceType.${exp.type}`, { defaultValue: exp.type })} variant="primary" />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">{exp.title}</p>
                          {(exp.startDate || exp.endDate) && (
                            <p className="text-xs text-muted-foreground">
                              {exp.startDate ? formatLocalDate(exp.startDate) : '—'}
                              {' — '}
                              {exp.endDate ? formatLocalDate(exp.endDate) : t('portfolio.present')}
                            </p>
                          )}
                          {exp.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{exp.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusChip
                          label={t(`experiences.readiness.${readiness}`)}
                          variant={readiness === 'ready' ? 'success' : readiness === 'thin' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{exp.role || '—'}</TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground max-w-[200px] truncate">
                        {exp.result || '—'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="sm" className="text-destructive">
                              {t('common.delete')}
                            </Button>
                          }
                          title={t('common.confirmDelete')}
                          description={t('common.confirmDeleteDesc')}
                          confirmLabel={t('common.delete')}
                          cancelLabel={t('common.cancel')}
                          destructive
                          onConfirm={() => deleteMutation.mutate(exp.id)}
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
    </PageShell>
  );
}
