/**
 * Which Today the parent sees (Figma row 47:661). Pure: today's date comes in as YYYY-MM-DD.
 * - empty: nothing saved yet.
 * - locked: something saved, but the daily five minutes need access (47:842).
 * - done: a daily session played past half was saved today (47:749).
 * - back: the last session is more than one day ago (62:1176).
 * - today: everything else (47:665, 54:137).
 */
// Relative paths, so vitest (which has no @ alias here) can load this file in its test.
import { isLocked, type Entitlement } from '../../../client/entitlement';
import { addDays } from '../../../lib/progress/history';
import { NORM_SECONDS } from '../../../lib/progress/targets';
import type { SavedSession } from '../../../lib/types';

export type TodayState =
  | { kind: 'empty' }
  | { kind: 'locked' }
  | { kind: 'done'; session: SavedSession }
  | { kind: 'back' }
  | { kind: 'today' };

export function todayState(sessions: readonly SavedSession[], today: string, entitlement: Entitlement): TodayState {
  if (sessions.length === 0) return { kind: 'empty' };
  if (isLocked('daily', entitlement)) return { kind: 'locked' };

  // The latest daily session of today: the one the review opens. A daily ended before half does not claim the day;
  // it is saved at exactly half of its five minutes (lib/round/session.ts).
  const done = [...sessions].reverse().find((s) => s.kind === 'daily' && s.date === today && 2 * s.durationSec > NORM_SECONDS);
  if (done) return { kind: 'done', session: done };

  const lastDay = sessions.reduce((latest, s) => (s.date > latest ? s.date : latest), sessions[0].date);
  if (lastDay < addDays(today, -1)) return { kind: 'back' };

  return { kind: 'today' };
}
