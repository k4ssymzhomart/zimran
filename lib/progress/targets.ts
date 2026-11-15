/**
 * Targets and results. The clinic norm for a five-minute coding is
 * 10 specific praises, 10 reflections, 10 descriptions, and no more than MAX_AVOID_5MIN
 * questions + commands + criticism. Shorter rounds use the same pace.
 */
import type { ChangeVerdict, CodedSentence, Counts, Lever, RoundChange, RoundResult, Targets } from '../types';

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
  description: 'Describe what her hands are doing, like a sportscaster.',
  reflection: 'Say her words back to her.',
  specific_praise: 'Praise one exact thing she did, not just "good job".',
};

/** The lever as it reads after "your biggest lever was". */
export const LEVER_NAME: Record<Lever, string> = {
  question: 'turning questions into statements',
  command: 'letting her lead',
  criticism: 'letting small things pass',
  description: 'describing what she does',
  reflection: 'saying her words back',
  specific_praise: 'naming exactly what you liked',
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
 * words from the parent's, so a reflection cannot be recognized and the round is judged on the other two skills.
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

/** Sentences that were coded: everything said in English, whatever its code. */
const said = (c: Counts): number => c.target + c.avoid + c.neutral + c.general_praise;

/** One opening sentence per verdict, for the screen that puts round 2 next to round 1. */
export const CHANGE_TEXT: Record<ChangeVerdict, string> = {
  improved: 'Round 2 was a step up from round 1.',
  held: 'You met the clinic pace in round 2.',
  same: 'About the same as round 1.',
  harder: 'Harder this time. One round is noisy; the plan looks at the trend over days.',
  silent: 'Nothing was said in round 2, so there is nothing to compare yet.',
};

/**
 * Compare two rounds of possibly different length, per minute.
 * The rates alone would flatter a shorter round 2 (one sentence in 40 seconds is "more per minute" than
 * one in 60) and would show a minus under a target that was met, so the counts and targets decide
 * what is called good news.
 */
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
  const spoke = said(after.counts) > 0;
  for (const k of ['description', 'reflection', 'specific_praise'] as const) {
    // Up means more of it was said, not the same count over a shorter round.
    if (d[k] > 0 && after.counts[k] > before.counts[k]) good.push(`${sign(d[k])} ${names[k]} per minute`);
    // Down is only worth a line when round 2 fell short of its own target for the skill.
    else if (d[k] < 0 && after.counts[k] < after.targets[k]) flat.push(`${sign(d[k])} ${names[k]} per minute`);
  }
  // Like the skills, these go by the count: the same one question over a shorter round 2 is not "more".
  // Fewer questions because nothing at all was said is not good news.
  const avoidDown = d.avoid < 0 && spoke && after.counts.avoid < before.counts.avoid;
  const avoidUp = d.avoid > 0 && after.counts.avoid > before.counts.avoid;
  if (avoidDown) good.push(`${sign(d.avoid)} ${names.avoid} per minute`);
  else if (avoidUp) flat.push(`${sign(d.avoid)} ${names.avoid} per minute`);

  const improved = good.length > 0 && !avoidUp && after.counts.target > 0;
  let verdict: ChangeVerdict;
  if (!spoke) verdict = 'silent';
  else if (improved) verdict = 'improved';
  else if (after.met) verdict = 'held';
  else if (flat.length > 0 && good.length === 0) verdict = 'harder';
  else verdict = 'same';
  return { perMinute: d, lines: [...good, ...flat], improved, verdict };
}

/**
 * How many of the parent's sentences were one of the skills, out of everything they said:
 * "5 of your 7 sentences were praise, reflection or description." Praise here is specific praise.
 * `line` is null when nothing was said. Live play does not count reflections, so its line leaves them out.
 */
export function skillMix(result: { counts: Counts; targets?: Targets }): { skills: number; total: number; line: string | null } {
  const skills = result.counts.target;
  const total = said(result.counts);
  if (total === 0) return { skills, total, line: null };
  const what = result.targets?.reflection === 0 ? 'praise or description' : 'praise, reflection or description';
  const line =
    total === 1
      ? skills === 1
        ? `Your one sentence was ${what}.`
        : 'Your one sentence was something else this time.'
      : `${skills} of your ${total} sentences were ${what}.`;
  return { skills, total, line };
}
