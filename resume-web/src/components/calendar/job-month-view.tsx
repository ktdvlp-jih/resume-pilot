import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  formatDayTitle,
  formatMonthTitle,
  monthGrid,
  padDateKey,
  parseDateKey,
  todayKey,
  type YearMonth,
} from '@/lib/calendar-month';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_CHIPS = 3;

export type CalendarJob = {
  id?: string;
  title?: string;
  companyName?: string;
  closesAt?: string | null;
  createdAt: string;
  shared?: boolean;
};

type JobMonthViewProps = {
  cursor: YearMonth;
  selectedKey: string;
  onSelect: (key: string) => void;
  byDate: Map<string, CalendarJob[]>;
  locale: string;
};

function weeksOf<T>(cells: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function JobMonthView({
  cursor,
  selectedKey,
  onSelect,
  byDate,
  locale,
}: JobMonthViewProps) {
  const { t } = useTranslation();
  const today = todayKey();
  const cells = monthGrid(cursor.year, cursor.month);
  const weeks = weeksOf(cells);
  const monthLabel = formatMonthTitle(cursor.year, cursor.month, locale);
  const weekdays = t('calendar.weekdays', { returnObjects: true });
  const weekdayLabels = Array.isArray(weekdays)
    ? weekdays.map(String)
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goMonth = (delta: number) => {
    const next = addMonths(cursor.year, cursor.month, delta);
    const { year: ty, month: tm } = parseDateKey(today);
    if (next.year === ty && next.month === tm) {
      onSelect(today);
    } else {
      onSelect(padDateKey(next.year, next.month, 1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('calendar.prevMonth')}
            onClick={() => goMonth(-1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelect(today)}
          >
            {t('calendar.today')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t('calendar.nextMonth')}
            onClick={() => goMonth(1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{t('calendar.monthGridCaption', { month: monthLabel })}</caption>
          <thead>
            <tr className="border-b bg-muted/40">
              {weekdayLabels.map((label, i) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    'px-1 py-2 text-center text-xs font-medium text-muted-foreground',
                    (i === 0) && 'text-destructive/80',
                  )}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]?.key} className="border-b last:border-b-0">
                {week.map((cell, i) => {
                  const jobs = byDate.get(cell.key) ?? [];
                  const selected = cell.key === selectedKey;
                  const isToday = cell.key === today;
                  const extra = Math.max(0, jobs.length - MAX_CHIPS);
                  const visible = jobs.slice(0, MAX_CHIPS);
                  const sunday = i === 0;
                  return (
                    <td key={cell.key} className="border-r p-0 align-top last:border-r-0">
                      <button
                        type="button"
                        aria-label={t('calendar.dayAria', {
                          date: formatDayTitle(cell.key, locale),
                          count: jobs.length,
                        })}
                        aria-current={isToday ? 'date' : undefined}
                        aria-pressed={selected}
                        onClick={() => onSelect(cell.key)}
                        className={cn(
                          'flex min-h-20 w-full flex-col gap-0.5 p-1 text-left hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-28',
                          !cell.inMonth && 'bg-muted/30',
                          selected && 'bg-primary/10 ring-1 ring-inset ring-primary',
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                            !cell.inMonth && 'text-muted-foreground',
                            sunday && cell.inMonth && !isToday && 'text-destructive/80',
                            isToday && 'bg-primary font-medium text-primary-foreground',
                          )}
                        >
                          {cell.day}
                        </span>
                        <span className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                          {visible.map((job, idx) => (
                            <span
                              key={`${cell.key}-${job.id ?? job.createdAt}-${idx}`}
                              className="hidden truncate rounded-sm bg-primary/15 px-1 py-0.5 text-[11px] leading-tight text-foreground md:block"
                            >
                              {job.title || job.companyName || t('jobPostings.noTitle')}
                            </span>
                          ))}
                          {jobs.length > 0 && (
                            <span className="flex flex-wrap gap-0.5 md:hidden">
                              {jobs.slice(0, 4).map((job, idx) => (
                                <span
                                  key={`${cell.key}-dot-${job.id ?? job.createdAt}-${idx}`}
                                  className="size-1.5 rounded-full bg-primary"
                                  aria-hidden
                                />
                              ))}
                            </span>
                          )}
                          {extra > 0 && (
                            <span className="hidden px-1 text-[11px] text-muted-foreground md:block">
                              {t('calendar.more', { count: extra })}
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
