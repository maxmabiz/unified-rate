import dayjs, { type Dayjs } from 'dayjs';

export function isTradingDay(date: string | Dayjs): boolean {
  const weekday = dayjs(date).day();
  return weekday !== 0 && weekday !== 6;
}

export function lastNTradingDays(endDate: string, n: number): string[] {
  const days: string[] = [];
  let cursor = dayjs(endDate);
  while (days.length < n) {
    if (isTradingDay(cursor)) {
      days.push(cursor.format('YYYY-MM-DD'));
    }
    cursor = cursor.subtract(1, 'day');
  }
  return days.reverse();
}

export function lastNCalendarDays(endDate: string, n: number): string[] {
  const end = dayjs(endDate);
  return Array.from({ length: n }, (_, index) => end.subtract(n - 1 - index, 'day').format('YYYY-MM-DD'));
}

export function calendarDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  if (cursor.isAfter(last, 'day')) return days;
  while (!cursor.isAfter(last, 'day')) {
    days.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function tradingDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = dayjs(start);
  const last = dayjs(end);
  if (cursor.isAfter(last, 'day')) return days;
  while (!cursor.isAfter(last, 'day')) {
    if (isTradingDay(cursor)) {
      days.push(cursor.format('YYYY-MM-DD'));
    }
    cursor = cursor.add(1, 'day');
  }
  return days;
}

export function formatSyncRange(start?: string, end?: string): string {
  if (!start || !end) return '-';
  if (start === end) return `${start}（全天）`;
  return `${start} 至 ${end}`;
}

export function latestTradingDay(from = dayjs()): string {
  let cursor = from;
  while (cursor.day() === 0 || cursor.day() === 6) {
    cursor = cursor.subtract(1, 'day');
  }
  return cursor.format('YYYY-MM-DD');
}

export function nowText(from = dayjs()): string {
  return from.format('YYYY-MM-DD HH:mm:ss');
}

export function formatDate(value?: string): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD');
}

export function formatDateTime(value?: string): string {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}
