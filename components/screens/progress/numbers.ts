/**
 * What Progress and the session review read out of the saved sessions. Pure: today comes in as YYYY-MM-DD and
 * nothing here reads the clock. The clinic numbers: ten of each skill in five minutes, at most three to swap.
 */
import { addDays } from '../../../lib/progress/history';
import { beforeAfter, bestStreakOf, weekNumbers } from '../../../lib/progress/sessions';
import { BUCKET, type SavedSession } from '../../../lib/types';

export const FIVE_MINUTES = 300;
/** Ten of each skill in five minutes. */
export const CLINIC_PACE = 10;
/** At most three sentences to swap in five minutes. */
export const MAX_SWAP = 3;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const word = (n: number): string => WORDS[n] ?? String(n);
export const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** "+4", "−3", "0", with one decimal at most and a real minus sign. */
export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (r > 0) return `+${r}`;
  if (r < 0) return `−${Math.abs(r)}`;
  return '0';
}

/** One session, or the mean of several, on the five-minute scale of the clinic numbers. Reflections are not counted in live play: null. */
export interface Pace {
  praise: number;
  reflect: number | null;
  describe: number;
  swap: number;
}

/**
 * A session's counts on the five-minute scale. A session shorter than five minutes is taken as it is, never scaled
 * up: four praises in one minute are four, not twenty, so Progress shows the same numbers as the session's review.
 * A longer one is scaled down.
 */
export function paceOf(session: SavedSession): Pace {
  const scale = FIVE_MINUTES / Math.max(session.durationSec, FIVE_MINUTES);
  const at = (n: number) => n * scale;
  return {
    praise: at(session.counts.specific_praise),
    reflect: session.kind === 'live' ? null : at(session.counts.reflection),
    describe: at(session.counts.description),
    swap: at(session.counts.avoid),
  };
}

const mean = (xs: number[]): number | null => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);

export function meanPace(sessions: readonly SavedSession[]): Pace | null {
  if (sessions.length === 0) return null;
  const paces = sessions.map(paceOf);
  return {
    praise: mean(paces.map((p) => p.praise)) ?? 0,
    reflect: mean(paces.flatMap((p) => (p.reflect === null ? [] : [p.reflect]))),
    describe: mean(paces.map((p) => p.describe)) ?? 0,
    swap: mean(paces.map((p) => p.swap)) ?? 0,
  };
}

export interface Week {
  /** Monday of the week. */
  from: string;
  label: string;
  sessions: number;
  pace: Pace | null;
}

/** The last four calendar weeks, oldest first, each as the mean pace of its sessions. */
export function fourWeeks(sessions: readonly SavedSession[], today: string): Week[] {
  const monday = weekNumbers(sessions, today).thisWeek.from;
  return [3, 2, 1, 0].map((back) => {
    const from = addDays(monday, -7 * back);
    const to = addDays(from, 6);
    const played = sessions.filter((s) => s.date >= from && s.date <= to);
    return { from, label: back === 0 ? 'This week' : `Week ${4 - back}`, sessions: played.length, pace: meanPace(played) };
  });
}

/**
 * The one line on top of Trends, without its "this week": "Praise is up four". It compares the mean pace of this
 * week with last week's, so an open week is never set against a full one by raw totals.
 */
export function trendLine(sessions: readonly SavedSession[], today: string): string {
  const weeks = fourWeeks(sessions, today);
  const now = weeks[3].pace;
  const before = weeks[2].pace;
  if (!now) return 'No session yet';
  if (!before) return weeks.slice(0, 2).some((w) => w.pace) ? 'Back at it' : 'Your first sessions';
  const ups: Array<[string, number]> = [
    ['Praise is', now.praise - before.praise],
    ['Reflections are', now.reflect !== null && before.reflect !== null ? now.reflect - before.reflect : 0],
    ['Descriptions are', now.describe - before.describe],
  ];
  const [subject, up] = ups.reduce((top, next) => (Math.round(next[1]) > Math.round(top[1]) ? next : top));
  if (Math.round(up) >= 1) return `${subject} up ${word(Math.round(up))}`;
  const fewer = Math.round(before.swap - now.swap);
  if (fewer >= 1) return `${capital(word(fewer))} fewer to swap`;
  return 'A steady pace';
}

/** One ring of Trends: the latest session's count, and the change since the session before it. */
export interface TrendStat {
  value: number | null;
  delta?: string;
}

export function latestStats(sessions: readonly SavedSession[]): { praise: TrendStat; reflect: TrendStat; describe: TrendStat; swap: TrendStat } | null {
  const last = sessions.at(-1);
  if (!last) return null;
  const now = paceOf(last);
  const prev = sessions.length > 1 ? paceOf(sessions[sessions.length - 2]) : null;
  const stat = (value: number | null, before: number | null | undefined): TrendStat => ({
    value: value === null ? null : Math.round(value),
    delta: value === null || before === null || before === undefined ? undefined : signed(Math.round(value) - Math.round(before)),
  });
  return {
    praise: stat(now.praise, prev?.praise),
    reflect: stat(now.reflect, prev?.reflect),
    describe: stat(now.describe, prev?.describe),
    swap: stat(now.swap, prev?.swap),
  };
}

/** The first visit, before and after the lesson, per minute. Null until both rounds are saved. */
export function firstVisitRows(sessions: readonly SavedSession[]): Array<{ delta: string; label: string }> | null {
  const { before, after } = beforeAfter(sessions);
  if (!before || !after) return null;
  const perMinute = (s: SavedSession, n: number) => (n * 60) / Math.max(s.durationSec, 1);
  const change = (pick: (s: SavedSession) => number) => signed(perMinute(after, pick(after)) - perMinute(before, pick(before)));
  return [
    { delta: change((s) => s.counts.reflection), label: 'reflections per minute' },
    { delta: change((s) => s.counts.specific_praise), label: 'specific praise per minute' },
    { delta: change((s) => s.counts.question + s.counts.command), label: 'questions and commands per minute' },
  ];
}

export interface Milestone {
  label: string;
  art: 'medal-star' | 'medal-flame' | 'medal-check' | 'crown';
  done: boolean;
}

export function milestonesOf(sessions: readonly SavedSession[]): Milestone[] {
  const days = new Set(sessions.map((s) => s.date)).size;
  return [
    { label: 'First round', art: 'medal-star', done: sessions.length > 0 },
    { label: '3 days running', art: 'medal-flame', done: bestStreakOf(sessions) >= 3 },
    { label: 'Clinic pace', art: 'medal-check', done: sessions.some((s) => s.met) },
    { label: 'Week one', art: 'crown', done: days >= 7 },
  ];
}

// ---------- one session ----------

/** "Nine skills, four to swap." */
export function reviewHeadline(session: SavedSession): string {
  const { target, avoid } = session.counts;
  return `${capital(word(target))} ${target === 1 ? 'skill' : 'skills'}, ${word(avoid)} to swap.`;
}

/** "Three minutes", or "1:30" when the length is not whole minutes. */
export function lengthWords(seconds: number): string {
  if (seconds > 0 && seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${capital(word(minutes))} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

/** The pattern rows of the review (Figma 48:1117, 54:725). A row shows only when the sentences can stand behind it. */
export function reviewRows(session: SavedSession): Array<{ label: string; value: string }> {
  const said = session.sentences.filter((s) => !s.disputed && s.code !== 'unknown').sort((a, b) => a.startSec - b.startSec);
  const rows: Array<{ label: string; value: string }> = [];
  const questions = said.filter((s) => s.code === 'question');

  const openers = new Map<string, number>();
  for (const q of questions) {
    const first = q.text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, '') ?? '';
    if (first) openers.set(first, (openers.get(first) ?? 0) + 1);
  }
  const top = [...openers.entries()].reduce<[string, number] | null>((best, next) => (!best || next[1] > best[1] ? next : best), null);
  if (top && top[1] >= 2) rows.push({ label: 'Most questions began with', value: `“${capital(top[0])}”` });

  if (questions.length > 0 && session.durationSec > 0) {
    const marks = [0, ...questions.map((q) => q.startSec), session.durationSec];
    const longest = marks.slice(1).reduce((best, at, i) => Math.max(best, at - marks[i]), 0);
    const seconds = Math.round(longest);
    rows.push({ label: 'Longest run without a question', value: `${seconds} ${seconds === 1 ? 'second' : 'seconds'}` });
  }

  const swaps = said.filter((s) => BUCKET[s.code] === 'avoid');
  if (swaps.length >= 2 && session.durationSec >= 60) {
    const firstHalf = swaps.filter((s) => s.startSec < session.durationSec / 2).length;
    rows.push({ label: 'To swap, first half then second', value: `${firstHalf}, then ${swaps.length - firstHalf}` });
  }
  return rows;
}
