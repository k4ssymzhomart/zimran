/**
 * Progress over days: sessions, the daily calm check-in, the plan day, streak, trend and mastery.
 * Dates are YYYY-MM-DD strings passed in by the caller; nothing here reads the clock.
 * Every function returns a new object, so a Progress can live in React state or localStorage as is.
 */
import type { Counts, Lever, RoundResult, Targets } from '../types';
import { planDay } from './plan';
import { biggestLever, LEVER_NAME, LEVER_NAME_LIVE, LEVER_TEXT, MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS, paceTargets } from './targets';

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
  /** The round was ended before half of its planned length. It completes no plan day and gives no lever. */
  short?: boolean;
  /** How many sentences the parent set aside with "Disagree?". Left out when none. */
  disputed?: number;
}

export interface Checkin {
  date: string;
  tantrums: TantrumBucket;
}

export interface Progress {
  v: 1;
  /** The date of the first recorded session. Kept for older screens; the plan day no longer reads it. */
  startDate: string | null;
  /** The daily moment the family ties the five minutes to, for example "after dinner". */
  anchor: string | null;
  sessions: SessionRecord[];
  checkins: Checkin[];
}

type Skill = 'specific_praise' | 'reflection' | 'description';

/** One missed day is forgiven within any window of this many days. */
const FREE_DAY_WINDOW = 7;

/**
 * A date completes a plan day when its sessions that are not short hold at least this many coded
 * sentences in total. Opening the app, or one sentence and "End round", does not move the plan.
 */
export const MIN_DAY_SENTENCES = 5;

export function emptyProgress(): Progress {
  return { v: 1, startDate: null, anchor: null, sessions: [], checkins: [] };
}

/** Coded sentences: everything said in English, whatever its code. */
const said = (c: Counts): number => c.target + c.avoid + c.neutral + c.general_praise;

/**
 * A round in which no sentence was coded: started and ended at once, or played in silence.
 * It is not a session. It is not saved, and it counts for no streak, trend or mastery.
 */
export const isEmptyResult = (r: { counts: Counts }): boolean => said(r.counts) === 0;

/**
 * Record a finished round. An empty round is not recorded: the same Progress comes back.
 * `short` and `disputed` are copied from the result, so the plan knows which records complete a day.
 */
export function addSession(p: Progress, result: RoundResult, date: string, mode: 'practice' | 'live'): Progress {
  if (isEmptyResult(result)) return p;
  const record: SessionRecord = {
    date,
    seconds: result.seconds,
    counts: { ...result.counts },
    met: result.met,
    mode,
    lever: result.lever,
    ...(result.short ? { short: true } : {}),
    ...(result.disputed ? { disputed: result.disputed } : {}),
  };
  return { ...p, startDate: p.startDate ?? date, sessions: [...p.sessions, record] };
}

const sameCounts = (a: Counts, b: Counts): boolean => (Object.keys(a) as (keyof Counts)[]).every((k) => a[k] === b[k]);

/**
 * Progress with one session's record brought up to date. With no `before` the result is simply recorded.
 * With one (the parent tapped "Disagree?" on the result screen after it was saved), the record written for
 * `before` is replaced by `result`, so the plan page shows the same numbers as that screen; a result
 * emptied this way takes its record out, and when that was the only session the plan has not started.
 * When the earlier record is no longer in storage, nothing is touched.
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

/**
 * The sessions that count, oldest date first (two of one date keep the order they were saved in).
 * Empty records saved by an older build are passed over. With `today`, so is anything dated after it:
 * a session saved while the device clock was set forward must not hold the plan back once the clock is right.
 */
function countedSessions(p: Progress, today?: string): SessionRecord[] {
  return p.sessions
    .filter((s) => !isEmptyResult(s) && (today === undefined || s.date <= today))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

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

// ---------- the plan day ----------

/** The dates that completed a plan day, oldest first. One date is one day, however many sessions it holds. */
function completedDates(p: Progress, today?: string): string[] {
  const sentences = new Map<string, number>();
  for (const s of countedSessions(p, today)) {
    if (!s.short) sentences.set(s.date, (sentences.get(s.date) ?? 0) + said(s.counts));
  }
  return [...sentences].filter(([, n]) => n >= MIN_DAY_SENTENCES).map(([date]) => date).sort();
}

/**
 * Where the family is in the plan. The plan moves by completed days, not by the calendar: a week away
 * costs nothing, and coming back opens the day that was next. `day` is today's plan day, 1-based; it stays
 * the same after today's session (`doneToday`) and moves on tomorrow. `completedDays` includes today.
 */
export function dayStatus(p: Progress, today: string): { day: number; doneToday: boolean; completedDays: number } {
  const done = completedDates(p, today);
  const doneToday = done.at(-1) === today;
  return { day: done.length - (doneToday ? 1 : 0) + 1, doneToday, completedDays: done.length };
}

/** Today's day of the plan, 1-based: the completed days before today, plus one. */
export function dayNumber(p: Progress, today: string): number {
  return dayStatus(p, today).day;
}

// ---------- streak ----------

/**
 * The walk both streaks share: consecutive days in `played`, back from today (from yesterday while today is
 * still open). One missed day in any 7 is a "life happens" day: it is skipped, not counted, and the streak goes on.
 */
function streakOver(played: ReadonlySet<string>, today: string): { days: number; freeDayUsed: boolean; activeToday: boolean } {
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

/**
 * Consecutive days with a session. Every record it is given counts as a played day: the saved-session
 * selectors (lib/progress/sessions.ts) pass their own records and rely on that. A session dated after
 * today is passed over. For the stricter rule of the plan, see `planStreak`.
 */
export function streak(p: Progress, today: string): { days: number; freeDayUsed: boolean; activeToday: boolean } {
  return streakOver(new Set(p.sessions.filter((s) => s.date <= today).map((s) => s.date)), today);
}

/**
 * Consecutive completed plan days. A day with only a short or near-silent round is a missed day here:
 * it did not complete a plan day either, so one word and "End round" keeps no streak.
 */
export function planStreak(p: Progress, today: string): { days: number; freeDayUsed: boolean; activeToday: boolean } {
  return streakOver(new Set(completedDates(p, today)), today);
}

// ---------- trend and mastery ----------

const round1 = (n: number): number => Math.round(n * 10) / 10;
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

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
function bestPerDay(p: Progress, today?: string): SessionRecord[] {
  const best = new Map<string, SessionRecord>();
  for (const s of countedSessions(p, today)) {
    const kept = best.get(s.date);
    if (!kept || standsFor(s, kept)) best.set(s.date, s);
  }
  return [...best.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * One point per day for the chart, on the five-minute scale: the clinic norm is 10 of each skill
 * and at most 3 questions, commands and corrections.
 * `reflection` is null on a day with only live play: it was not measured, which is not the same as zero.
 * With `today`, sessions dated after it are left out.
 */
export function skillTrend(
  p: Progress,
  today?: string,
): { date: string; specific_praise: number; reflection: number | null; description: number; avoid: number }[] {
  return bestPerDay(p, today).map((s) => ({
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
 * With `today`, sessions dated after it are left out.
 */
export function masteryShare(
  p: Progress,
  today?: string,
): { specific_praise: number; reflection: number | null; description: number; avoidOk: boolean; overall: number } {
  const latest = bestPerDay(p, today).at(-1);
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
    overall: mean(measured),
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
 * The parent's own week 1 next to their week 4 of the plan: the average day of plan days 1-7 and of plan
 * days 22-28, on the five-minute scale. Weeks are counted in completed plan days, not on the calendar, so a
 * family that took six weeks over the plan still compares its first seven days with its last seven.
 * Only saved practice sessions of at least `minSeconds` that were not ended early are averaged (the two
 * short rounds of the first visit are left out, so they cannot make week 1 look weak).
 * Null until both weeks have such a day. With `today`, sessions dated after it are left out.
 */
export function weekOneAndFour(
  p: Progress,
  minSeconds: number,
  today?: string,
): { first: WeekAverage; fourth: WeekAverage } | null {
  const done = completedDates(p, today);
  const daily = { ...p, sessions: p.sessions.filter((s) => s.mode === 'practice' && !s.short && s.seconds >= minSeconds) };
  // A point's plan day is the place of its date among the completed days; other dates belong to no plan day.
  const points = skillTrend(daily, today).map((point) => ({ ...point, planDay: done.indexOf(point.date) + 1 }));
  const average = (from: number, to: number): WeekAverage | null => {
    const days = points.filter((point) => point.planDay >= from && point.planDay <= to);
    if (days.length === 0) return null;
    return {
      days: days.length,
      specific_praise: round1(mean(days.map((d) => d.specific_praise))),
      reflection: round1(mean(days.map((d) => d.reflection ?? 0))),
      description: round1(mean(days.map((d) => d.description))),
      avoid: round1(mean(days.map((d) => d.avoid))),
    };
  };
  const first = average(1, 7);
  const fourth = average(22, 28);
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

const LEVERS: readonly Lever[] = ['question', 'command', 'criticism', 'specific_praise', 'reflection', 'description'];

/** How far back `lastLever` looks, in counted sessions. */
const LEVER_LOOKBACK = 5;

/** Counted sessions that were not ended early. A short round is not measured against the pace, so it names no lever. */
const fullSessions = (p: Progress, today?: string): SessionRecord[] => countedSessions(p, today).filter((s) => !s.short);

/** The lever a session ended with. A record saved without it is read from its counts against the pace for its length. */
function leverOf(s: SessionRecord): Lever | null {
  if (s.lever !== undefined) return s.lever;
  const pace = paceTargets(s.seconds);
  return s.met ? null : biggestLever(s.counts, s.mode === 'live' ? { ...pace, reflection: 0 } : pace);
}

/**
 * The parent's biggest lever, the same notion the first visit uses: the most frequent of questions,
 * commands and corrections when over the limit, else the skill furthest from its target.
 * It is taken from the latest of the last five counted sessions that has one, so the personal line does
 * not vanish after a single round that met the pace. Null with no counted session, or when none of the
 * five has a lever. With `today`, sessions dated after it are left out.
 */
export function lastLever(p: Progress, today?: string): LeverNote | null {
  const recent = fullSessions(p, today).slice(-LEVER_LOOKBACK);
  for (let i = recent.length - 1; i >= 0; i--) {
    const lever = leverOf(recent[i]);
    if (!lever) continue;
    const name = LEVER_NAME[lever];
    const line = i === recent.length - 1 ? `Last session your biggest lever was ${name}.` : `Your biggest lever lately has been ${name}.`;
    return { date: recent[i].date, lever, name, text: LEVER_TEXT[lever], line };
  }
  return null;
}

/** How many sessions `todayFocus` reads, and the shortest one it reads: half of a five-minute session. */
const FOCUS_SESSIONS = 3;
const FOCUS_MIN_SECONDS = NORM_SECONDS / 2;

const AVOID_LEVERS = ['question', 'command', 'criticism'] as const;
const SKILL_LEVERS = ['description', 'reflection', 'specific_praise'] as const;
const COUNT_WORDS: Record<Lever, [one: string, many: string]> = {
  question: ['question', 'questions'],
  command: ['command', 'commands'],
  criticism: ['correction', 'corrections'],
  description: ['description', 'descriptions'],
  reflection: ['reflection', 'reflections'],
  specific_praise: ['specific praise', 'specific praises'],
};
const counted = (n: number, lever: Lever): string => `${n} ${COUNT_WORDS[lever][n === 1 ? 0 : 1]}`;

/**
 * What today's session leans on. The plan's focus for the day is the default; the family's own numbers
 * override it when the last three daily sessions (not ended early, at least half of five minutes long, so
 * the short rounds of the first visit do not speak for the family) show a clear weak spot:
 *  (a) questions, commands and corrections ran above the allowed pace in at least two of them:
 *      the most frequent of the three becomes the focus (a tie goes to the plan's own, else to the first in that order);
 *  (b) else one skill averages under half of the clinic pace while the plan's skill for today is at 80% of
 *      it or more: the lowest such skill becomes the focus (a tie: description, reflection, specific praise).
 *      On a plan day that focuses on questions or commands, "at 80%" means their average is within the limit.
 * On the plan's "Your own focus" day any skill under the pace qualifies in (b).
 * With fewer than two such sessions the plan speaks. `line` is one sentence with the numbers behind the choice.
 */
export function todayFocus(p: Progress, today: string): { lever: Lever; source: 'plan' | 'data'; line: string } {
  const plan = planDay(dayNumber(p, today));
  // A day of live play is about the parent's own child, who may be a son.
  const name = plan.live ? LEVER_NAME_LIVE : LEVER_NAME;
  // A skill check is about all three skills; after day 28 there is no weekly theme to name.
  const planLine = plan.isMasteryCheck
    ? 'Today is the skill check: all three skills against the clinic pace.'
    : plan.theme === 'Keep'
      ? `Today follows the plan: ${name[plan.focus]}.`
      : `Today follows the plan, ${plan.theme}: ${name[plan.focus]}.`;
  const fromPlan = { lever: plan.focus, source: 'plan' as const, line: planLine };
  const recent = fullSessions(p, today).filter((s) => s.seconds >= FOCUS_MIN_SECONDS).slice(-FOCUS_SESSIONS);
  if (recent.length < 2) return fromPlan;
  const lead = `Your last ${recent.length === 2 ? 'two' : 'three'} sessions`;
  const start = (lever: Lever): string => `so today starts with ${name[lever]}.`;

  // (a) Too many questions, commands and corrections come before any skill: they hand the lead back to the parent.
  const over = recent.filter((s) => avoidOnNormScale(s) > MAX_AVOID_5MIN).length;
  if (over >= 2) {
    const total = (k: Lever): number => recent.reduce((sum, s) => sum + s.counts[k], 0);
    const most = Math.max(...AVOID_LEVERS.map(total));
    const top = AVOID_LEVERS.filter((k) => total(k) === most);
    const lever: Lever = top.find((k) => k === plan.focus) ?? top[0];
    // Two sessions over the pace hold at least four such sentences, so the top one never rounds down to zero.
    const line = `${lead} averaged ${counted(Math.round(most / recent.length), lever)}, ${start(lever)}`;
    return { lever, source: 'data', line };
  }

  // (b) A skill far behind while today's plan skill is nearly there.
  // Live play does not measure reflections, so they are averaged over the practice sessions only.
  const average = (k: Skill): number | null => {
    const measured = k === 'reflection' ? recent.filter((s) => s.mode === 'practice') : recent;
    return measured.length > 0 ? mean(measured.map((s) => onNormScale(s.counts[k], s.seconds))) : null;
  };
  const planSkill = SKILL_LEVERS.find((k) => k === plan.focus);
  const planNearlyThere = planSkill
    ? (average(planSkill) ?? 0) >= 0.8 * NORM_PER_SKILL
    : mean(recent.map(avoidOnNormScale)) <= MAX_AVOID_5MIN;
  const limit = plan.weakSpot ? NORM_PER_SKILL : NORM_PER_SKILL / 2;
  let weakest: { lever: Skill; value: number } | null = null;
  for (const k of SKILL_LEVERS) {
    const value = average(k);
    if (value !== null && value < limit && (weakest === null || value < weakest.value)) weakest = { lever: k, value };
  }
  if (weakest && (planNearlyThere || plan.weakSpot)) {
    const line = `${lead} averaged ${counted(Math.round(weakest.value), weakest.lever)} against a clinic pace of ${NORM_PER_SKILL}, ${start(weakest.lever)}`;
    return { lever: weakest.lever, source: 'data', line };
  }
  return fromPlan;
}

/**
 * Average tantrum bucket per 7-day week. Week 1 starts on the earlier of the first check-in and the first
 * session, so check-ins made before the first session stay visible. Weeks without a check-in are null.
 */
export function calmTrend(p: Progress): { week: number; average: number | null }[] {
  const firstSession = countedSessions(p)[0]?.date ?? p.startDate;
  const origin = [...p.checkins.map((c) => c.date), ...(firstSession ? [firstSession] : [])].sort()[0];
  if (origin === undefined) return [];
  const byWeek = new Map<number, number[]>();
  for (const c of p.checkins) {
    const week = Math.floor(daysBetween(origin, c.date) / 7) + 1;
    byWeek.set(week, [...(byWeek.get(week) ?? []), c.tantrums]);
  }
  const out: { week: number; average: number | null }[] = [];
  for (let week = 1; week <= Math.max(0, ...byWeek.keys()); week++) {
    const values = byWeek.get(week);
    out.push({ week, average: values ? mean(values) : null });
  }
  return out;
}

// ---------- loading saved progress ----------

const COUNT_KEYS: (keyof Counts)[] = [
  'specific_praise', 'reflection', 'description', 'general_praise', 'neutral',
  'question', 'command', 'criticism', 'target', 'avoid',
];
const TARGET_KEYS: (keyof Targets)[] = ['specific_praise', 'reflection', 'description', 'maxAvoid'];

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isDate = (x: unknown): x is string =>
  typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && addDays(x, 0) === x;
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const isLever = (x: unknown): x is Lever => LEVERS.includes(x as Lever);

/** A copy with exactly the known keys, or null when one of them is not a count. */
function readNumbers<K extends string>(x: unknown, keys: readonly K[]): Record<K, number> | null {
  if (!isObject(x) || !keys.every((k) => isCount(x[k]))) return null;
  return Object.fromEntries(keys.map((k) => [k, x[k]])) as Record<K, number>;
}

function fromJson(json: unknown): unknown {
  if (typeof json !== 'string') return json;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * One saved session, or null when what the trends are computed from is not there: the date, the time,
 * the counts, met and the mode. The optional fields are dropped on their own when they do not read
 * (an unknown lever is worked out from the counts again), so they never cost the family a session.
 */
function readSession(x: unknown): SessionRecord | null {
  if (!isObject(x) || !isDate(x.date) || !isCount(x.seconds) || typeof x.met !== 'boolean') return null;
  if (x.mode !== 'practice' && x.mode !== 'live') return null;
  const counts = readNumbers(x.counts, COUNT_KEYS);
  if (!counts) return null;
  return {
    date: x.date,
    seconds: x.seconds,
    counts,
    met: x.met,
    mode: x.mode,
    ...(x.lever === null || isLever(x.lever) ? { lever: x.lever } : {}),
    ...(x.short === true ? { short: true } : {}),
    ...(isCount(x.disputed) && x.disputed > 0 ? { disputed: x.disputed } : {}),
  };
}

function readCheckin(x: unknown): Checkin | null {
  if (!isObject(x) || !isDate(x.date) || ![0, 1, 2, 3].includes(x.tantrums as number)) return null;
  return { date: x.date, tantrums: x.tantrums as TantrumBucket };
}

/**
 * Read saved progress and say how much of it could not be read. Every valid session and check-in is kept;
 * only the records that do not read are dropped, and `dropped` counts them. A missing or damaged anchor,
 * start date, version or list costs nothing else: one odd record must never erase a family's history
 * on the next save. Text that is not JSON, or not an object, gives an empty Progress.
 */
export function readProgress(json: unknown): { progress: Progress; dropped: number } {
  const data = fromJson(json);
  if (!isObject(data)) return { progress: emptyProgress(), dropped: 0 };
  let dropped = 0;
  const keep = <T>(list: unknown, read: (x: unknown) => T | null): T[] => {
    const out: T[] = [];
    for (const x of Array.isArray(list) ? list : []) {
      const record = read(x);
      if (record) out.push(record);
      else dropped += 1;
    }
    return out;
  };
  // An empty record (saved by an older build) is not a session and not a damaged record: it is left behind quietly.
  const sessions = keep(data.sessions, readSession).filter((s) => !isEmptyResult(s));
  const checkins = keep(data.checkins, readCheckin);
  const firstDate = sessions.map((s) => s.date).sort()[0] ?? null;
  const progress: Progress = {
    v: 1,
    startDate: isDate(data.startDate) ? data.startDate : firstDate,
    anchor: typeof data.anchor === 'string' ? data.anchor : null,
    sessions,
    checkins,
  };
  return { progress, dropped };
}

/** Saved progress, with whatever could not be read left out. See `readProgress` for the count of those. */
export function parseProgress(json: unknown): Progress {
  return readProgress(json).progress;
}

/** A round result with the shape the screens read, or null. The lever text is taken from today's copy. */
function readResult(x: unknown): RoundResult | null {
  if (!isObject(x) || !isCount(x.seconds) || typeof x.met !== 'boolean') return null;
  const counts = readNumbers(x.counts, COUNT_KEYS);
  const targets = readNumbers(x.targets, TARGET_KEYS);
  if (!counts || !targets) return null;
  const lever = isLever(x.lever) ? x.lever : null;
  return {
    seconds: x.seconds,
    counts,
    targets,
    met: x.met,
    lever,
    leverText: lever ? LEVER_TEXT[lever] : null,
    ...(x.short === true ? { short: true } : {}),
    ...(isCount(x.disputed) && x.disputed > 0 ? { disputed: x.disputed } : {}),
  };
}

/**
 * The two rounds of the first visit as the dashboard needs them, or null when either does not read.
 * The dashboard compares their counts and targets, so a `{}` in that key must come back as "nothing saved".
 */
export function parseFirstRounds(json: unknown): { before: RoundResult; after: RoundResult } | null {
  const data = fromJson(json);
  if (!isObject(data)) return null;
  const before = readResult(data.before);
  const after = readResult(data.after);
  return before && after ? { before, after } : null;
}

// ---------- taking the history to another device ----------

/** The name and version written into an exported file, and checked when one comes back. */
export const EXPORT_FORMAT = 'playreps-progress';
export const EXPORT_VERSION = 1;

/** The family's history as a file they can keep: pretty JSON. `exportedOn` is the caller's date, YYYY-MM-DD. */
export function exportProgress(p: Progress, exportedOn: string): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedOn, progress: p }, null, 2);
}

/**
 * Read a file written by `exportProgress`. Null when it is not one (other JSON, another format name or
 * version, no list of sessions), so a screen can say so instead of replacing the history with nothing.
 * Inside a file that is ours, records are read as leniently as saved progress is.
 */
export function importProgress(text: string): Progress | null {
  const data = fromJson(text);
  if (!isObject(data) || data.format !== EXPORT_FORMAT || data.version !== EXPORT_VERSION) return null;
  if (!isObject(data.progress) || !Array.isArray(data.progress.sessions)) return null;
  return readProgress(data.progress).progress;
}
