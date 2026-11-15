/**
 * The small sums of the week screens, on top of the selectors in lib/progress/sessions.ts. Pure: dates come in as
 * YYYY-MM-DD strings and nothing reads the clock.
 */
import { addDays } from '../../../lib/progress/history';
import { PLAN_DAYS } from '../../../lib/progress/plan';
import { weekNumbers, type SkillTotals, type WeekTotals } from '../../../lib/progress/sessions';
import type { Lever, SavedSession } from '../../../lib/types';

export type SkillKey = keyof SkillTotals;

export const SKILLS: readonly { key: SkillKey; label: string; noun: string }[] = [
  { key: 'specific_praise', label: 'Praise', noun: 'Praise' },
  { key: 'reflection', label: 'Reflect', noun: 'Reflections' },
  { key: 'description', label: 'Describe', noun: 'Descriptions' },
  { key: 'avoid', label: 'To swap', noun: 'Sentences to swap' },
];

/** The number a plan day's focus moves: questions, commands and corrections all count as "to swap". */
export function skillOf(focus: Lever): SkillKey {
  return focus === 'question' || focus === 'command' || focus === 'criticism' ? 'avoid' : focus;
}

/** One decimal at most: 4, 2.5. */
export function short(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Per session, so a week still open compares fairly with a finished one. Null for a week without sessions. */
export function perSession(week: WeekTotals, key: SkillKey): number | null {
  return week.sessions > 0 ? week[key] / week.sessions : null;
}

export interface ShownWeek {
  /** The week the screen reads out, and the week before it. */
  now: WeekTotals;
  before: WeekTotals;
  /** True for this calendar week; false when this week has no session yet and last week is read out instead. */
  current: boolean;
}

/** This week once it has a session; until then last week, so a Monday still reads the week just played. */
export function shownWeek(sessions: readonly SavedSession[], today: string): ShownWeek {
  const { thisWeek, lastWeek } = weekNumbers(sessions, today);
  if (thisWeek.sessions > 0) return { now: thisWeek, before: lastWeek, current: true };
  const earlier = weekNumbers(sessions, addDays(today, -7));
  return { now: earlier.thisWeek, before: earlier.lastWeek, current: false };
}

/** Per minute over the sessions of one day. Null when they hold no time at all. */
export function perMinute(sessions: readonly SavedSession[], key: SkillKey): number | null {
  const seconds = sessions.reduce((sum, s) => sum + s.durationSec, 0);
  if (seconds <= 0) return null;
  return sessions.reduce((sum, s) => sum + s.counts[key], 0) / (seconds / 60);
}

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export interface PlanDays {
  /** Sessions inside the 28 days, counted from the first session's day. */
  sessions: SavedSession[];
  first: { date: string; day: number; sessions: SavedSession[] };
  /** The last day played inside the 28 days, and its day number. */
  last: { date: string; day: number; sessions: SavedSession[] };
  /** Days with at least one session at the clinic pace. */
  paceDays: number;
}

/** The 28 days of the plan as played: day 1 is the day of the first session. Null without sessions. */
export function planDays(all: readonly SavedSession[]): PlanDays | null {
  if (all.length === 0) return null;
  const firstDate = all.reduce((min, s) => (s.date < min ? s.date : min), all[0].date);
  const end = addDays(firstDate, PLAN_DAYS - 1);
  const sessions = all.filter((s) => s.date <= end);
  const lastDate = sessions.reduce((max, s) => (s.date > max ? s.date : max), firstDate);
  const on = (date: string) => sessions.filter((s) => s.date === date);
  return {
    sessions,
    first: { date: firstDate, day: 1, sessions: on(firstDate) },
    last: { date: lastDate, day: daysBetween(firstDate, lastDate) + 1, sessions: on(lastDate) },
    paceDays: new Set(sessions.filter((s) => s.met).map((s) => s.date)).size,
  };
}
