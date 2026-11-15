/**
 * What the saved sessions say: streak, calendar, week totals, plan day, the first visit's before and after,
 * and the patterns inside one session. Pure: dates come in as YYYY-MM-DD strings and nothing reads the clock.
 */
import type { SavedSentence, SavedSession } from '../types';
import { addDays, emptyProgress, streak } from './history';
import { PLAN_DAYS } from './plan';

type Sessions = readonly SavedSession[];

// ---------- dates ----------

const DAY_MS = 86_400_000;

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** The Monday of the week a date falls in. Weeks run Monday to Sunday, as in the Figma calendar. */
function mondayOf(date: string): string {
  const weekday = new Date(Date.parse(date)).getUTCDay(); // 0 is Sunday
  return addDays(date, -((weekday + 6) % 7));
}

// ---------- streak ----------

export interface Streak {
  days: number;
  freeDayUsed: boolean;
  activeToday: boolean;
}

/** Days in a row with a session. One missed day in any seven is forgiven: the rule itself lives in history.ts. */
export function streakOf(sessions: Sessions, today: string): Streak {
  const records = sessions.map((s) => ({
    date: s.date,
    seconds: s.durationSec,
    counts: s.counts,
    met: s.met,
    mode: s.kind === 'live' ? ('live' as const) : ('practice' as const),
  }));
  return streak({ ...emptyProgress(), sessions: records }, today);
}

/** The longest streak so far, by the same rule: the best of the streaks that end on each practice day. */
export function bestStreakOf(sessions: Sessions): number {
  const days = new Set(sessions.map((s) => s.date));
  return [...days].reduce((best, day) => Math.max(best, streakOf(sessions, day).days), 0);
}

// ---------- calendar ----------

export interface CalendarDay {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  /** Sessions played that day. */
  sessions: number;
  /** True when at least one of them met the clinic pace. */
  met: boolean;
}

/**
 * A month as rows of seven days, Monday first. Days of the neighboring months fill the first and last rows
 * with `inMonth: false`. A month index outside 0..11 rolls into the next or previous year.
 */
export function monthGrid(sessions: Sessions, year: number, monthIndex: number, today: string): CalendarDay[][] {
  const byDay = new Map<string, { sessions: number; met: boolean }>();
  for (const s of sessions) {
    const seen = byDay.get(s.date) ?? { sessions: 0, met: false };
    byDay.set(s.date, { sessions: seen.sessions + 1, met: seen.met || s.met });
  }
  const first = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  const month = first.slice(0, 7);
  const day = (date: string): CalendarDay => ({
    date,
    inMonth: date.startsWith(month),
    isToday: date === today,
    sessions: byDay.get(date)?.sessions ?? 0,
    met: byDay.get(date)?.met ?? false,
  });

  const weeks: CalendarDay[][] = [];
  for (let monday = mondayOf(first); monday.slice(0, 7) <= month; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => day(addDays(monday, i))));
  }
  return weeks;
}

// ---------- totals ----------

export interface SkillTotals {
  specific_praise: number;
  reflection: number;
  description: number;
  /** Questions, commands and corrections together: the "to swap" number. */
  avoid: number;
}

function sumSkills(sessions: Sessions): SkillTotals {
  const sum: SkillTotals = { specific_praise: 0, reflection: 0, description: 0, avoid: 0 };
  for (const s of sessions) {
    sum.specific_praise += s.counts.specific_praise;
    sum.reflection += s.counts.reflection;
    sum.description += s.counts.description;
    sum.avoid += s.counts.avoid;
  }
  return sum;
}

export interface WeekTotals extends SkillTotals {
  /** Monday and Sunday of the week. */
  from: string;
  to: string;
  sessions: number;
}

/** Plain totals for this week and the week before. This week is still open, so it can only grow. */
export function weekNumbers(sessions: Sessions, today: string): { thisWeek: WeekTotals; lastWeek: WeekTotals } {
  const week = (from: string): WeekTotals => {
    const to = addDays(from, 6);
    const played = sessions.filter((s) => s.date >= from && s.date <= to);
    return { from, to, sessions: played.length, ...sumSkills(played) };
  };
  const monday = mondayOf(today);
  return { thisWeek: week(monday), lastWeek: week(addDays(monday, -7)) };
}

export interface Totals extends SkillTotals {
  sessions: number;
  /** Different days with at least one session. */
  days: number;
  seconds: number;
  /** Sessions that met the clinic pace. */
  met: number;
}

export function totalsOf(sessions: Sessions): Totals {
  return {
    sessions: sessions.length,
    days: new Set(sessions.map((s) => s.date)).size,
    seconds: sessions.reduce((sum, s) => sum + s.durationSec, 0),
    met: sessions.filter((s) => s.met).length,
    ...sumSkills(sessions),
  };
}

// ---------- plan ----------

/** Day of the plan: day 1 is the date of the first session, and the count stops at the last plan day. */
export function planDayOf(sessions: Sessions, today: string): number {
  if (sessions.length === 0) return 1;
  const first = sessions.reduce((min, s) => (s.date < min ? s.date : min), sessions[0].date);
  return Math.min(PLAN_DAYS, Math.max(1, daysBetween(first, today) + 1));
}

// ---------- the first visit ----------

/** The parent's own before and after: the first round of the first visit and the round after the lesson. */
export function beforeAfter(sessions: Sessions): { before: SavedSession | null; after: SavedSession | null } {
  const startOf = (s: SavedSession): number => Date.parse(s.startedAt) || 0;
  const inOrder = [...sessions].sort((a, b) => startOf(a) - startOf(b));
  const before = inOrder.find((s) => s.kind === 'first_before') ?? null;
  const after = inOrder.find((s) => s.kind === 'first_after' && (!before || startOf(s) >= startOf(before))) ?? null;
  return { before, after };
}

// ---------- patterns in one session ----------

export interface SessionPattern {
  id: 'question_run' | 'praise_share' | 'pace' | 'repeat' | 'opener';
  title: string;
  detail: string;
  /** The number behind the finding: run length, praises, sentences of difference, times said. */
  count: number;
}

/** A finding is shown only when the session holds enough to stand behind it. */
const MIN_QUESTION_RUN = 3;
const MIN_SENTENCES_FOR_SHARE = 4;
const MIN_PACE_GAP = 2;
const MIN_SAME_OPENER = 3;
const MINUTE = 60;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number): string => WORDS[n] ?? String(n);
const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const quote = (text: string): string => `“${text.trim()}”`;
const sentences = (n: number): string => (n === 1 ? '1 sentence' : `${n} sentences`);
const clock = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** A sentence without case and punctuation, so "Good job!" and "good job" are the same sentence. */
const plain = (text: string): string =>
  text.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const openerOf = (text: string): string => plain(text).split(' ').slice(0, 2).join(' ');

/** The largest group of sentences sharing a key; the group that appeared first wins a tie. */
function largestGroup(said: SavedSentence[], keyOf: (text: string) => string): SavedSentence[] {
  const groups = new Map<string, SavedSentence[]>();
  for (const s of said) {
    const key = keyOf(s.text);
    if (key) groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()].reduce<SavedSentence[]>((top, g) => (g.length > top.length ? g : top), []);
}

function questionRun(said: SavedSentence[]): SessionPattern | null {
  let best = { start: 0, length: 0 };
  let start = 0;
  said.forEach((s, i) => {
    if (s.code !== 'question' || s.disputed) start = i + 1;
    else if (i - start + 1 > best.length) best = { start, length: i - start + 1 };
  });
  if (best.length < MIN_QUESTION_RUN) return null;
  const first = said[best.start];
  return {
    id: 'question_run',
    title: `${capital(word(best.length))} questions in a row`,
    detail: `Starting at ${clock(first.startSec)}: ${quote(first.text)}`,
    count: best.length,
  };
}

function praiseShare(said: SavedSentence[]): SessionPattern | null {
  const praises = said.filter((s) => s.code === 'specific_praise').length;
  if (praises === 0 || said.length < MIN_SENTENCES_FOR_SHARE) return null;
  return {
    id: 'praise_share',
    title: `Specific praise was ${Math.round((praises / said.length) * 100)}% of what you said`,
    detail: `${praises} of ${sentences(said.length)} named exactly what you liked.`,
    count: praises,
  };
}

/** Needs two full minutes, so the first minute and the last one do not overlap. */
function pace(said: SavedSentence[], durationSec: number): SessionPattern | null {
  if (durationSec < 2 * MINUTE) return null;
  const first = said.filter((s) => s.startSec < MINUTE).length;
  const last = said.filter((s) => s.startSec >= durationSec - MINUTE).length;
  // Nothing said in the last minute can mean the round was ended early: its measured length is never under half the
  // planned one, so that "last minute" may be time nobody played. Say nothing rather than claim a minute that did not happen.
  if (last === 0) return null;
  if (Math.abs(first - last) < MIN_PACE_GAP) return null;
  return {
    id: 'pace',
    title: last < first ? 'You said less in the last minute' : 'You said more in the last minute',
    detail: `${capital(sentences(first))} in the first minute, ${last} in the last.`,
    count: Math.abs(first - last),
  };
}

function repeated(said: SavedSentence[]): SessionPattern | null {
  const same = largestGroup(said, plain);
  if (same.length < 2) return null;
  return {
    id: 'repeat',
    title: `One sentence, ${same.length === 2 ? 'twice' : `${word(same.length)} times`}`,
    detail: quote(same[0].text),
    count: same.length,
  };
}

/** The first two words most sentences began with. One sentence said again and again is `repeated`, not an opener. */
function opener(said: SavedSentence[]): SessionPattern | null {
  const same = largestGroup(said, openerOf);
  if (same.length < MIN_SAME_OPENER || new Set(same.map((s) => plain(s.text))).size < 2) return null;
  return {
    id: 'opener',
    title: `Your most used opener: ${quote(capital(openerOf(same[0].text)))}`,
    detail: `${same.length} of ${sentences(said.length)} began this way.`,
    count: same.length,
  };
}

/**
 * What the saved sentences of one session show, found by rules. A finding appears only when the session
 * supports it, so a session saved without sentences has none. Disputed and uncoded sentences are left out
 * of every count, and they end a run of questions, so a run is never overstated.
 */
export function sessionPatterns(session: SavedSession): SessionPattern[] {
  const inOrder = [...session.sentences].sort((a, b) => a.startSec - b.startSec);
  const said = inOrder.filter((s) => !s.disputed && s.code !== 'unknown' && plain(s.text) !== '');
  const found = [questionRun(inOrder), praiseShare(said), pace(said, session.durationSec), repeated(said), opener(said)];
  return found.filter((p): p is SessionPattern => p !== null);
}
