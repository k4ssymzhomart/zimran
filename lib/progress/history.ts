/**
 * Progress over days: sessions, the daily calm check-in, streak, trend and mastery.
 * Dates are YYYY-MM-DD strings passed in by the caller; nothing here reads the clock.
 * Every function returns a new object, so a Progress can live in React state or localStorage as is.
 */
import type { Counts, Lever, RoundResult } from '../types';
import { biggestLever, LEVER_NAME, LEVER_TEXT, MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS, paceTargets } from './targets';

/** Tantrums today: none, 1-2, 3-5, 6 or more. */
export type TantrumBucket = 0 | 1 | 2 | 3;

export interface SessionRecord {
  date: string;
  seconds: number;
  counts: Counts;
  met: boolean;
  mode: 'practice' | 'live';
  /**
   * The one thing to work on that the round ended with; null when it met the pace.
   * Records saved before this field existed do not have it: `lastLever` then works it out from the counts.
   */
  lever?: Lever | null;
}

export interface Checkin {
  date: string;
  tantrums: TantrumBucket;
}

export interface Progress {
  v: 1;
  startDate: string | null;
  /** The daily moment the family ties the five minutes to, for example "after dinner". */
  anchor: string | null;
  sessions: SessionRecord[];
  checkins: Checkin[];
}

type Skill = 'specific_praise' | 'reflection' | 'description';

/** One missed day is forgiven within any window of this many days. */
const FREE_DAY_WINDOW = 7;

export function emptyProgress(): Progress {
  return { v: 1, startDate: null, anchor: null, sessions: [], checkins: [] };
}

/**
 * A round in which no sentence was coded: started and ended at once, or played in silence.
 * It is not a session. It is not saved, and it counts for no streak, trend or mastery.
 */
export const isEmptyResult = (r: { counts: Counts }): boolean =>
  r.counts.target + r.counts.avoid + r.counts.neutral + r.counts.general_praise === 0;

/**
 * Record a finished round. The first session fixes day 1 of the plan.
 * An empty round is not recorded: the same Progress comes back.
 */
export function addSession(p: Progress, result: RoundResult, date: string, mode: 'practice' | 'live'): Progress {
  if (isEmptyResult(result)) return p;
  const record: SessionRecord = { date, seconds: result.seconds, counts: { ...result.counts }, met: result.met, mode, lever: result.lever };
  return { ...p, startDate: p.startDate ?? date, sessions: [...p.sessions, record] };
}

const sameCounts = (a: Counts, b: Counts): boolean => (Object.keys(a) as (keyof Counts)[]).every((k) => a[k] === b[k]);

/**
 * Progress with one session's record brought up to date. With no `before` the result is simply recorded.
 * With one (the parent tapped "Disagree?" on the result screen after it was saved), the record written for
 * `before` is replaced by `result`, so the plan page shows the same numbers as that screen; a result
 * emptied this way takes its record out, and when that was the only session the plan has not started:
 * day 1 is counted from a session that exists. When the earlier record is no longer in storage, nothing is touched.
 */
export function replaceSession(
  p: Progress,
  before: RoundResult | null,
  result: RoundResult,
  date: string,
  mode: 'practice' | 'live',
): Progress {
  let base = p;
  if (before && !isEmptyResult(before)) {
    let at = -1;
    p.sessions.forEach((s, i) => {
      if (s.date === date && s.mode === mode && s.seconds === before.seconds && sameCounts(s.counts, before.counts)) at = i;
    });
    if (at < 0) return p;
    base = { ...p, sessions: p.sessions.filter((_, i) => i !== at) };
  }
  const next = addSession(base, result, date, mode);
  return next.startDate === null || next.sessions.some((s) => !isEmptyResult(s)) ? next : { ...next, startDate: null };
}

/** The sessions that count. Empty records saved by an older build are still in storage and are passed over. */
const countedSessions = (p: Progress): SessionRecord[] => p.sessions.filter((s) => !isEmptyResult(s));

/** One check-in per day: a second answer on the same date replaces the first. */
export function addCheckin(p: Progress, date: string, tantrums: TantrumBucket): Progress {
  return { ...p, checkins: [...p.checkins.filter((c) => c.date !== date), { date, tantrums }] };
}

// ---------- dates ----------

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Pure UTC arithmetic, so daylight saving and the user's time zone cannot shift a day. */
export function addDays(date: string, n: number): string {
  return new Date(toUtc(date) + n * DAY_MS).toISOString().slice(0, 10);
}

const daysBetween = (from: string, to: string): number => Math.round((toUtc(to) - toUtc(from)) / DAY_MS);

/** Day of the plan, 1-based from the first session. */
export function dayNumber(p: Progress, date: string): number {
  return p.startDate ? Math.max(1, daysBetween(p.startDate, date) + 1) : 1;
}

// ---------- streak ----------

/**
 * Consecutive days with a session, walking back from today (from yesterday while today is still open).
 * One missed day in any 7 is a "life happens" day: it is skipped, not counted, and the streak goes on.
 */
export function streak(p: Progress, today: string): { days: number; freeDayUsed: boolean; activeToday: boolean } {
  // Every record given counts as a played day: an empty round is never recorded (addSession), and empty records
  // of an older build are dropped when storage is read (parseProgress).
  const played = new Set(p.sessions.map((s) => s.date));
  const activeToday = played.has(today);
  const first = [...played].sort()[0];
  let days = 0;
  let freeDayUsed = false;
  let lastMiss: number | null = null;
  // A miss only counts as a used free day once an earlier session joins the streak across it.
  let missPending = false;

  for (let back = activeToday ? 0 : 1; first !== undefined; back++) {
    const date = addDays(today, -back);
    if (date < first) break;
    if (played.has(date)) {
      days += 1;
      if (missPending) freeDayUsed = true;
      missPending = false;
    } else {
      if (lastMiss !== null && back - lastMiss < FREE_DAY_WINDOW) break;
      lastMiss = back;
      missPending = true;
    }
  }
  return { days, freeDayUsed, activeToday };
}

// ---------- trend and mastery ----------

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * A count on the five-minute scale of the clinic norm. A session shorter than five minutes is taken as it
 * is, never scaled up: one praise in twenty seconds is one praise, not fifteen. A longer one is scaled down.
 */
const onNormScale = (count: number, seconds: number): number => (count * NORM_SECONDS) / Math.max(seconds, NORM_SECONDS);

/** Questions, commands and corrections are scaled both ways: a short round at that rate would break the limit. */
const avoidOnNormScale = (s: SessionRecord): number => (s.seconds > 0 ? (s.counts.avoid * NORM_SECONDS) / s.seconds : 0);

const skills = (s: SessionRecord): number => onNormScale(s.counts.target, s.seconds);

/** Praise and descriptions: the two skills that practice and live play both measure. */
const sharedSkills = (s: SessionRecord): number => onNormScale(s.counts.specific_praise + s.counts.description, s.seconds);

/**
 * Does `s` stand for its day instead of `kept`? Two sessions of one kind: more skill sentences on the
 * five-minute scale, so a full session is not hidden by a short burst. A practice round against live play:
 * only the two skills both measure are compared. Practice wins a tie, because it also measures reflections.
 */
function standsFor(s: SessionRecord, kept: SessionRecord): boolean {
  if (s.mode === kept.mode) return skills(s) > skills(kept);
  return sharedSkills(s) > sharedSkills(kept) || (sharedSkills(s) === sharedSkills(kept) && s.mode === 'practice');
}

/** The session that stands for each day, oldest day first. */
function bestPerDay(p: Progress): SessionRecord[] {
  const best = new Map<string, SessionRecord>();
  for (const s of countedSessions(p)) {
    const kept = best.get(s.date);
    if (!kept || standsFor(s, kept)) best.set(s.date, s);
  }
  return [...best.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * One point per day for the chart, on the five-minute scale: the clinic norm is 10 of each skill
 * and at most 3 questions, commands and corrections.
 * `reflection` is null on a day with only live play: it was not measured, which is not the same as zero.
 */
export function skillTrend(
  p: Progress,
): { date: string; specific_praise: number; reflection: number | null; description: number; avoid: number }[] {
  return bestPerDay(p).map((s) => ({
    date: s.date,
    specific_praise: round1(onNormScale(s.counts.specific_praise, s.seconds)),
    reflection: s.mode === 'live' ? null : round1(onNormScale(s.counts.reflection, s.seconds)),
    description: round1(onNormScale(s.counts.description, s.seconds)),
    avoid: round1(avoidOnNormScale(s)),
  }));
}

/**
 * How close the latest day is to the clinic norm of 10 of each skill in five minutes, 0..1 per skill.
 * After a day with only live play `reflection` is null (not measured) and `overall` averages the other two.
 */
export function masteryShare(
  p: Progress,
): { specific_praise: number; reflection: number | null; description: number; avoidOk: boolean; overall: number } {
  const latest = bestPerDay(p).at(-1);
  if (!latest) return { specific_praise: 0, reflection: 0, description: 0, avoidOk: false, overall: 0 };
  const share = (k: Skill): number => Math.min(1, onNormScale(latest.counts[k], latest.seconds) / NORM_PER_SKILL);
  const specific_praise = share('specific_praise');
  const description = share('description');
  const reflection = latest.mode === 'live' ? null : share('reflection');
  const measured = reflection === null ? [specific_praise, description] : [specific_praise, reflection, description];
  return {
    specific_praise,
    reflection,
    description,
    // Staying under the limit by saying nothing is not the skill.
    avoidOk: !isEmptyResult(latest) && latest.seconds > 0 && avoidOnNormScale(latest) <= MAX_AVOID_5MIN,
    overall: measured.reduce((a, b) => a + b, 0) / measured.length,
  };
}

export interface WeekAverage {
  /** How many days of that week had such a session. */
  days: number;
  specific_praise: number;
  reflection: number;
  description: number;
  avoid: number;
}

/**
 * The parent's own week 1 next to their week 4 of the plan: the average day of each, on the five-minute
 * scale, from saved practice sessions of at least `minSeconds` (the two short rounds of the first visit
 * are left out, so they cannot make week 1 look weak). Null until both weeks have such a day.
 */
export function weekOneAndFour(p: Progress, minSeconds: number): { first: WeekAverage; fourth: WeekAverage } | null {
  const daily = { ...p, sessions: p.sessions.filter((s) => s.mode === 'practice' && s.seconds >= minSeconds) };
  const points = skillTrend(daily).map((point) => ({ ...point, week: Math.ceil(dayNumber(p, point.date) / 7) }));
  const mean = (values: number[]): number => round1(values.reduce((a, b) => a + b, 0) / values.length);
  const average = (week: number): WeekAverage | null => {
    const days = points.filter((point) => point.week === week);
    if (days.length === 0) return null;
    return {
      days: days.length,
      specific_praise: mean(days.map((d) => d.specific_praise)),
      reflection: mean(days.map((d) => d.reflection ?? 0)),
      description: mean(days.map((d) => d.description)),
      avoid: mean(days.map((d) => d.avoid)),
    };
  };
  const first = average(1);
  const fourth = average(4);
  return first && fourth ? { first, fourth } : null;
}

// ---------- personalization ----------

export interface LeverNote {
  /** The date of the session the lever comes from. */
  date: string;
  lever: Lever;
  /** The lever as a phrase: "saying her words back". */
  name: string;
  /** What to do about it, the same line the result screen shows. */
  text: string;
  /** Ready to print at the top of the next session. */
  line: string;
}

const LEVERS: readonly string[] = ['question', 'command', 'criticism', 'specific_praise', 'reflection', 'description'];

/**
 * The parent's biggest lever from their latest counted session, the same notion the first visit uses:
 * the most frequent of questions, commands and corrections when over the limit, else the skill furthest
 * from its target. Null with no counted session yet, or when that session met the clinic pace.
 * A record saved without its lever is read from its counts against the pace for its length.
 */
export function lastLever(p: Progress): LeverNote | null {
  let latest: SessionRecord | undefined;
  for (const s of countedSessions(p)) if (!latest || s.date >= latest.date) latest = s;
  if (!latest) return null;
  let lever = latest.lever;
  if (lever === undefined) {
    const pace = paceTargets(latest.seconds);
    lever = latest.met ? null : biggestLever(latest.counts, latest.mode === 'live' ? { ...pace, reflection: 0 } : pace);
  }
  if (!lever) return null;
  const name = LEVER_NAME[lever];
  return { date: latest.date, lever, name, text: LEVER_TEXT[lever], line: `Last session your biggest lever was ${name}.` };
}

/** Average tantrum bucket per 7-day week, counted from the first session. Weeks without a check-in are null. */
export function calmTrend(p: Progress): { week: number; average: number | null }[] {
  const origin = p.startDate ?? [...p.checkins.map((c) => c.date)].sort()[0];
  if (origin === undefined) return [];
  const byWeek = new Map<number, number[]>();
  for (const c of p.checkins) {
    const week = Math.floor(daysBetween(origin, c.date) / 7) + 1;
    if (week >= 1) byWeek.set(week, [...(byWeek.get(week) ?? []), c.tantrums]);
  }
  const out: { week: number; average: number | null }[] = [];
  for (let week = 1; week <= Math.max(0, ...byWeek.keys()); week++) {
    const values = byWeek.get(week);
    out.push({ week, average: values ? values.reduce((a, b) => a + b, 0) / values.length : null });
  }
  return out;
}

// ---------- loading saved progress ----------

const COUNT_KEYS: (keyof Counts)[] = [
  'specific_praise', 'reflection', 'description', 'general_praise', 'neutral',
  'question', 'command', 'criticism', 'target', 'avoid',
];

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown): x is string =>
  typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;

function isSession(x: unknown): x is SessionRecord {
  return (
    isObject(x) &&
    isDate(x.date) &&
    isCount(x.seconds) &&
    typeof x.met === 'boolean' &&
    (x.mode === 'practice' || x.mode === 'live') &&
    (x.lever === undefined || x.lever === null || LEVERS.includes(x.lever as string)) &&
    isObject(x.counts) &&
    COUNT_KEYS.every((k) => isCount((x.counts as Record<string, unknown>)[k]))
  );
}

function isCheckin(x: unknown): x is Checkin {
  return isObject(x) && isDate(x.date) && [0, 1, 2, 3].includes(x.tantrums as number);
}

/** Read saved progress. Anything that does not look exactly like a Progress starts the family fresh. */
export function parseProgress(json: unknown): Progress {
  let data = json;
  if (typeof json === 'string') {
    try {
      data = JSON.parse(json);
    } catch {
      return emptyProgress();
    }
  }
  if (
    !isObject(data) ||
    data.v !== 1 ||
    !(data.startDate === null || isDate(data.startDate)) ||
    !(data.anchor === null || typeof data.anchor === 'string') ||
    !Array.isArray(data.sessions) ||
    !data.sessions.every(isSession) ||
    !Array.isArray(data.checkins) ||
    !data.checkins.every(isCheckin)
  ) {
    return emptyProgress();
  }
  return {
    v: 1,
    startDate: data.startDate,
    anchor: data.anchor,
    // An empty record (saved by an older build) is not a session: it is left behind here.
    sessions: data.sessions.filter((s) => !isEmptyResult(s)).map((s) => ({
      date: s.date,
      seconds: s.seconds,
      counts: { ...s.counts },
      met: s.met,
      mode: s.mode,
      ...(s.lever !== undefined ? { lever: s.lever } : {}),
    })),
    checkins: data.checkins.map((c) => ({ date: c.date, tantrums: c.tantrums })),
  };
}
