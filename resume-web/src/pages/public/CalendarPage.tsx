import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getAccessToken, type JobPostingResponse, type PublicJobPostingResponse } from '@/lib/api';
import { PublicPage } from '@/components/layout/public-page';
import { PageShell } from '@/components/common/page-shell';
import { EmptyState } from '@/components/common/empty-state';
import { JobMonthView, type CalendarJob } from '@/components/calendar/job-month-view';
import { dateKeyFromInstant, formatDayTitle, parseDateKey, todayKey } from '@/lib/calendar-month';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CalendarView = 'shared' | 'mine';

function isOwnedPosting(p: JobPostingResponse) {
  return p.owned !== false;
}

function toCalendarJob(row: PublicJobPostingResponse | JobPostingResponse): CalendarJob {
  return {
    id: 'id' in row ? row.id : undefined,
    title: row.title,
    companyName: row.companyName,
    closesAt: row.closesAt,
    createdAt: row.createdAt,
    shared: 'shared' in row ? row.shared : true,
  };
}

function groupByDeadline(rows: CalendarJob[]) {
  const dated = new Map<string, CalendarJob[]>();
  const undated: CalendarJob[] = [];
  for (const row of rows) {
    if (!row.closesAt) {
      undated.push(row);
      continue;
    }
    const key = dateKeyFromInstant(row.closesAt);
    const list = dated.get(key) ?? [];
    list.push(row);
    dated.set(key, list);
  }
  return { dated, undated };
}

function nearestDateKey(dated: Map<string, CalendarJob[]>, today: string): string {
  if (dated.has(today)) return today;
  const keys = [...dated.keys()].sort();
  const upcoming = keys.find((key) => key >= today);
  return upcoming ?? keys.at(-1) ?? today;
}

function jobKey(job: CalendarJob, suffix: string, index: number) {
  return `${job.id ?? job.createdAt}-${suffix}-${index}`;
}

export default function CalendarPage({ embedded = false }: { embedded?: boolean }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const loggedIn = !!getAccessToken();
  const fallbackView: CalendarView = embedded ? 'mine' : 'shared';
  const rawView = params.get('view');
  const view: CalendarView = rawView === 'mine' || rawView === 'shared' ? rawView : fallbackView;
  const locale =
    i18n.language === 'ko' ? 'ko-KR' : i18n.language === 'ja' ? 'ja-JP' : i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  const sharedQuery = useQuery({
    queryKey: ['public-shared-job-postings'],
    queryFn: api.listPublicSharedJobPostings,
  });
  const mineQuery = useQuery({
    queryKey: ['job-postings'],
    queryFn: api.listJobPostings,
    enabled: loggedIn,
  });

  const rows = useMemo<CalendarJob[]>(() => {
    if (view === 'mine') {
      if (!loggedIn) return [];
      return (mineQuery.data ?? []).filter(isOwnedPosting).map(toCalendarJob);
    }
    return (sharedQuery.data ?? []).map(toCalendarJob);
  }, [view, loggedIn, mineQuery.data, sharedQuery.data]);

  const today = todayKey();
  const [selectedKey, setSelectedKey] = useState(today);
  const jumpedToDeadline = useRef(false);

  const { dated, undated } = useMemo(() => groupByDeadline(rows), [rows]);
  const selectedJobs = dated.get(selectedKey) ?? [];
  const cursor = parseDateKey(selectedKey);

  useEffect(() => {
    jumpedToDeadline.current = false;
  }, [view]);

  useEffect(() => {
    if (jumpedToDeadline.current || dated.size === 0) return;
    setSelectedKey(nearestDateKey(dated, todayKey()));
    jumpedToDeadline.current = true;
  }, [dated, view]);

  const setView = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === fallbackView) nextParams.delete('view');
    else nextParams.set('view', next);
    setParams(nextParams, { replace: true });
  };

  const isLoading = view === 'mine' ? loggedIn && mineQuery.isLoading : sharedQuery.isLoading;
  const isError = view === 'mine' ? loggedIn && mineQuery.isError : sharedQuery.isError;
  const guestMine = view === 'mine' && !loggedIn;

  const ctaTo = view === 'mine' ? (loggedIn ? '/job-postings' : '/login') : loggedIn ? '/job-postings' : '/signup';
  const ctaLabel =
    view === 'mine'
      ? loggedIn
        ? t('calendar.ctaMine')
        : t('calendar.ctaMineGuest')
      : loggedIn
        ? t('calendar.ctaLoggedIn')
        : t('calendar.cta');

  const renderJob = (job: CalendarJob, suffix: string, index: number, showUndated: boolean) => (
    <li key={jobKey(job, suffix, index)} className="flex flex-col gap-1 rounded-lg border px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="font-medium break-keep">{job.title || t('jobPostings.noTitle')}</p>
        {view === 'mine' && job.shared && (
          <Badge variant="secondary">{t('jobPostings.sharedBadge')}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {job.companyName || '—'}
        {showUndated ? ` · ${t('calendar.noDeadline')}` : ''}
      </p>
      {job.id && (
        <Button variant="link" size="sm" className="h-auto w-fit px-0" asChild>
          <Link to={`/workspace?postingId=${job.id}`}>{t('jobPostings.useInWorkspace')}</Link>
        </Button>
      )}
    </li>
  );

  const body = (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {!embedded && <h1 className="text-3xl font-semibold tracking-tight">{t('calendar.title')}</h1>}
          <p className="text-pretty text-muted-foreground">
            {view === 'mine' ? t('calendar.descMine') : t('calendar.descShared')}
          </p>
          <p className="text-sm text-muted-foreground">
            {view === 'mine'
              ? loggedIn
                ? t('calendar.hintMine')
                : t('calendar.hintMineGuest')
              : t('calendar.hintShared')}
          </p>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList aria-label={t('calendar.viewLabel')}>
            <TabsTrigger value="shared">{t('calendar.viewShared')}</TabsTrigger>
            <TabsTrigger value="mine">{t('calendar.viewMine')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </header>
      {guestMine ? (
        <EmptyState
          title={t('calendar.emptyMineGuest')}
          action={
            <Button asChild>
              <Link to="/login">{t('calendar.ctaMineGuest')}</Link>
            </Button>
          }
        />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={view === 'mine' ? t('calendar.emptyMine') : t('calendar.emptyShared')}
          action={
            <Button variant="outline" asChild>
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
          <div className="flex flex-col gap-3">
            {dated.size === 0 && (
              <p className="text-sm text-muted-foreground">{t('calendar.noDatedHint')}</p>
            )}
            <JobMonthView
              cursor={{ year: cursor.year, month: cursor.month }}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              byDate={dated}
              locale={locale}
            />
          </div>
          <div className="flex flex-col gap-4 xl:sticky xl:top-20">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="text-base font-medium">{formatDayTitle(selectedKey, locale)}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('calendar.selectedEmpty')}</p>
                ) : (
                  <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {selectedJobs.map((job, i) => renderJob(job, 'day', i, false))}
                  </ul>
                )}
              </CardContent>
            </Card>
            {undated.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2 className="text-base font-medium">{t('calendar.undatedTitle')}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{t('calendar.undatedHint')}</p>
                  <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {undated.map((job, i) => renderJob(job, 'undated', i, true))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      {!guestMine && rows.length > 0 && (
        <Button variant="outline" asChild>
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      )}
    </>
  );

  if (embedded) {
    return (
      <PageShell size="xl">{body}</PageShell>
    );
  }

  return (
    <PublicPage title={t('calendar.title')} description={t('calendar.desc')} path="/calendar" width="xl">
      {body}
    </PublicPage>
  );
}
