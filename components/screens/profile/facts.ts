/** The few numbers the Profile header reads from the saved sessions. Pure: no clock, no storage. */
import type { SavedSession } from '@/lib/types';

const SKILL_WORD = { specific_praise: 'Praise', reflection: 'Reflect', description: 'Describe' } as const;
const SWAP_WORD = { question: 'Questions', command: 'Commands', criticism: 'Corrections' } as const;

type Skill = keyof typeof SKILL_WORD;
type Swap = keyof typeof SWAP_WORD;

/**
 * How close one session came to the clinic pace for its own length, 0 to 100: each skill counts up to its target,
 * and the skills are averaged. Reflections are not measured in live play. Null when the session has no targets.
 */
export function paceOf(session: SavedSession): number | null {
  const skills: Skill[] = session.kind === 'live' ? ['specific_praise', 'description'] : ['specific_praise', 'reflection', 'description'];
  const parts = skills
    .filter((skill) => (session.targets?.[skill] ?? 0) > 0)
    .map((skill) => Math.min(1, session.counts[skill] / session.targets[skill]));
  if (parts.length === 0) return null;
  return Math.round((100 * parts.reduce((sum, part) => sum + part, 0)) / parts.length);
}

/** The key with the largest total over all sessions; null while every total is zero. */
function mostOf<K extends string>(sessions: readonly SavedSession[], keys: readonly K[], count: (s: SavedSession, key: K) => number): K | null {
  let best: K | null = null;
  let most = 0;
  for (const key of keys) {
    const total = sessions.reduce((sum, s) => sum + (count(s, key) || 0), 0);
    if (total > most) {
      most = total;
      best = key;
    }
  }
  return best;
}

/** "Describe": the skill said most over all sessions. */
export function strongestOf(sessions: readonly SavedSession[]): string | null {
  const skill = mostOf(sessions, Object.keys(SKILL_WORD) as Skill[], (s, key) => s.counts[key]);
  return skill ? SKILL_WORD[skill] : null;
}

/** "Questions": the kind of sentence to swap that came up most over all sessions. */
export function firstSwapOf(sessions: readonly SavedSession[]): string | null {
  const swap = mostOf(sessions, Object.keys(SWAP_WORD) as Swap[], (s, key) => s.counts[key]);
  return swap ? SWAP_WORD[swap] : null;
}

/** "4 days", "1 day". */
export const daysLabel = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'}`;
