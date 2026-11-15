/** The few strings the tab screens build from a saved session. The kit rows take them ready-made. */
import { addDays } from '@/lib/progress/history';
import type { SavedSession } from '@/lib/types';

/** "Tue 10 Nov" from a saved YYYY-MM-DD day. Midday keeps the date from slipping across time zones. */
export function dayLabel(date: string): string {
  const day = new Date(`${date}T12:00:00`);
  const part = (options: Intl.DateTimeFormatOptions) => day.toLocaleDateString('en-US', options);
  return `${part({ weekday: 'short' })} ${day.getDate()} ${part({ month: 'short' })}`;
}

/** "Today", "Yesterday", or the day itself. */
export function whenLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  return date === addDays(today, -1) ? 'Yesterday' : dayLabel(date);
}

/** "17 skills, 9 to swap": the counted skill sentences and the ones to swap. */
export function countsLine({ counts }: Pick<SavedSession, 'counts'>): string {
  return `${counts.target} ${counts.target === 1 ? 'skill' : 'skills'}, ${counts.avoid} to swap`;
}

/** Whole seconds as m:ss. */
export function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
