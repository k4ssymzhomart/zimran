/**
 * Targets and results. The clinic norm for a five-minute coding is
 * 10 specific praises, 10 reflections, 10 descriptions, and no more than MAX_AVOID_5MIN
 * questions + commands + criticism. Shorter rounds use the same pace.
 */
import type { CodedSentence, Counts, Lever, RoundChange, RoundResult, Targets } from '../types';

export const NORM_SECONDS = 300;
export const NORM_PER_SKILL = 10;
/** Training materials say "3 or fewer" or "fewer than 3". Change this one constant if you follow the stricter reading. */
export const MAX_AVOID_5MIN = 3;

export function paceTargets(seconds: number): Targets {
  const per = Math.max(1, Math.round((NORM_PER_SKILL * seconds) / NORM_SECONDS));
  return {
    specific_praise: per,
    reflection: per,
    description: per,
    maxAvoid: Math.floor((MAX_AVOID_5MIN * seconds) / NORM_SECONDS),
  };
}

export function countCodes(coded: CodedSentence[]): Counts {
  const c: Counts = {
    specific_praise: 0,
    reflection: 0,
    description: 0,
    general_praise: 0,
    neutral: 0,
    question: 0,
    command: 0,
    criticism: 0,
    target: 0,
    avoid: 0,
  };
  for (const s of coded) {
    if (s.code === 'unknown') continue;
    c[s.code] += 1;
    if (s.bucket === 'target') c.target += 1;
    if (s.bucket === 'avoid') c.avoid += 1;
  }
  return c;
}

export const LEVER_TEXT: Record<Lever, string> = {
  question: 'Turn questions into descriptions: say what you see her doing.',
  command: 'Let her lead: describe what she chose instead of telling her what to do.',
  criticism: 'Skip the correction. Praise the opposite the moment you see it.',
  description: 'Describe what her hands are doing, like a sports commentator.',
  reflection: 'Say her words back to her.',
  specific_praise: 'Praise one exact thing she did, not just "good job".',
};

/** The one thing to work on next: the most frequent avoid if over the limit, else the widest gap to target. */
export function biggestLever(counts: Counts, targets: Targets): Lever | null {
  if (counts.avoid > targets.maxAvoid) {
    const avoid: Lever[] = ['question', 'command', 'criticism'];
    return avoid.reduce((best, k) => (counts[k] > counts[best] ? k : best), avoid[0]);
  }
  const skills: Lever[] = ['description', 'reflection', 'specific_praise'];
  let lever: Lever | null = null;
  let widest = 0;
  for (const k of skills) {
    const gap = targets[k as 'description' | 'reflection' | 'specific_praise'] - counts[k];
    if (gap > widest) {
      widest = gap;
      lever = k;
    }
  }
  return lever;
}

/**
 * `reflections: false` is for live play with a real child: one microphone cannot tell the child's
 * words from the parent's, so a reflection cannot be recognised and the round is judged on the other two skills.
 */
export function summarizeRound(coded: CodedSentence[], seconds: number, opts: { reflections?: boolean } = {}): RoundResult {
  const counts = countCodes(coded);
  const pace = paceTargets(seconds);
  const targets = opts.reflections === false ? { ...pace, reflection: 0 } : pace;
  const met =
    counts.specific_praise >= targets.specific_praise &&
    counts.reflection >= targets.reflection &&
    counts.description >= targets.description &&
    counts.avoid <= targets.maxAvoid;
  const lever = met ? null : biggestLever(counts, targets);
  return { seconds, counts, targets, met, lever, leverText: lever ? LEVER_TEXT[lever] : null };
}

const perMinute = (count: number, seconds: number): number => (seconds > 0 ? (count * 60) / seconds : 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Compare two rounds of possibly different length, per minute. */
export function compareRounds(before: RoundResult, after: RoundResult): RoundChange {
  const delta = (k: 'specific_praise' | 'reflection' | 'description' | 'avoid'): number =>
    round1(perMinute(after.counts[k], after.seconds) - perMinute(before.counts[k], before.seconds));

  const d = {
    specific_praise: delta('specific_praise'),
    reflection: delta('reflection'),
    description: delta('description'),
    avoid: delta('avoid'),
  };

  const names = {
    specific_praise: 'specific praise',
    reflection: 'reflections',
    description: 'descriptions',
    avoid: 'questions, commands and corrections',
  } as const;
  const sign = (n: number): string => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

  const good: string[] = [];
  const flat: string[] = [];
  for (const k of ['description', 'reflection', 'specific_praise'] as const) {
    if (d[k] > 0) good.push(`${sign(d[k])} ${names[k]} per minute`);
    else if (d[k] < 0) flat.push(`${sign(d[k])} ${names[k]} per minute`);
  }
  if (d.avoid < 0) good.push(`${sign(d.avoid)} ${names.avoid} per minute`);
  else if (d.avoid > 0) flat.push(`${sign(d.avoid)} ${names.avoid} per minute`);

  const improved = good.length > 0 && d.avoid <= 0;
  return { perMinute: d, lines: [...good, ...flat], improved };
}
