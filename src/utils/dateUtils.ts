import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfYear,
  endOfYear,
  addMonths,
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  format,
  isWithinInterval,
  eachDayOfInterval,
} from 'date-fns';
import { DisplayRange } from '@/types';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getRangeForAnchor(anchor: Date, range: DisplayRange): DateRange {
  switch (range) {
    case 'DAILY':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case 'WEEKLY':
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    case 'MONTHLY':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'QUARTERLY':
      return { start: startOfMonth(subMonths(anchor, 2)), end: endOfMonth(anchor) };
    case 'HALF_YEARLY':
      return { start: startOfMonth(subMonths(anchor, 5)), end: endOfMonth(anchor) };
    case 'YEARLY':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
    default:
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
}

export function shiftAnchor(anchor: Date, range: DisplayRange, direction: 1 | -1): Date {
  switch (range) {
    case 'DAILY':
      return direction === 1 ? addDays(anchor, 1) : subDays(anchor, 1);
    case 'WEEKLY':
      return direction === 1 ? addWeeks(anchor, 1) : subWeeks(anchor, 1);
    case 'MONTHLY':
      return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
    case 'QUARTERLY':
      return direction === 1 ? addMonths(anchor, 3) : subMonths(anchor, 3);
    case 'HALF_YEARLY':
      return direction === 1 ? addMonths(anchor, 6) : subMonths(anchor, 6);
    case 'YEARLY':
      return direction === 1 ? addYears(anchor, 1) : subYears(anchor, 1);
    default:
      return direction === 1 ? addMonths(anchor, 1) : subMonths(anchor, 1);
  }
}

export function formatRangeLabel(anchor: Date, range: DisplayRange): string {
  switch (range) {
    case 'DAILY':
      return format(anchor, 'MMM d, yyyy');
    case 'WEEKLY': {
      const { start, end } = getRangeForAnchor(anchor, range);
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    case 'YEARLY':
      return format(anchor, 'yyyy');
    default:
      return format(anchor, 'MMMM yyyy');
  }
}

export function isDateInRange(dateIso: string, range: DateRange): boolean {
  const d = new Date(dateIso);
  return isWithinInterval(d, { start: range.start, end: range.end });
}

export function groupHeaderLabel(dateIso: string): string {
  return format(new Date(dateIso), 'MMM dd, EEEE');
}

export function daysInRange(range: DateRange): Date[] {
  return eachDayOfInterval({ start: range.start, end: range.end });
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function periodKeyForMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}
