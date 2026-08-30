/** 채용 마감은 한국 날짜 기준으로 달력에 올립니다. */
export const JOB_CALENDAR_TZ = 'Asia/Seoul';

export type YearMonth = { year: number; month: number };

export type MonthCell = {
  key: string;
  day: number;
  inMonth: boolean;
};

export function dateKeyFromInstant(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: JOB_CALENDAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function todayKey(): string {
  return dateKeyFromInstant(new Date().toISOString());
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year: year || 1970, month: month || 1, day: day || 1 };
}

export function addMonths(year: number, month: number, delta: number): YearMonth {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function padDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatMonthTitle(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: JOB_CALENDAR_TZ,
    year: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)));
}

export function formatDayTitle(key: string, locale: string): string {
  const { year, month, day } = parseDateKey(key);
  return new Intl.DateTimeFormat(locale, {
    timeZone: JOB_CALENDAR_TZ,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day, 3, 0, 0)));
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdaySun0(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day, 3, 0, 0)).getUTCDay();
}

/** 구글 캘린더처럼 항상 6주(42칸)입니다. */
export function monthGrid(year: number, month: number): MonthCell[] {
  const firstWeekday = weekdaySun0(year, month, 1);
  const daysInMonth = lastDayOfMonth(year, month);
  const prev = addMonths(year, month, -1);
  const daysInPrev = lastDayOfMonth(prev.year, prev.month);
  const cells: MonthCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    const day = daysInPrev - firstWeekday + 1 + i;
    cells.push({ key: padDateKey(prev.year, prev.month, day), day, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ key: padDateKey(year, month, day), day, inMonth: true });
  }
  const next = addMonths(year, month, 1);
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ key: padDateKey(next.year, next.month, nextDay), day: nextDay, inMonth: false });
    nextDay += 1;
  }
  return cells;
}
