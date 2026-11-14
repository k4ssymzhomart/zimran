/**
 * Demo: fast-forward a simulated family through the plan.
 * A seeded synthetic parent picks what kind of sentence to say; everything after that is the real engine:
 * the sentences are coded by codeSentence, the child moves with tick and applyMove,
 * and the day's result comes from summarizeRound. No session result is written in by hand.
 * The parent's learning curve is invented, which is why DEMO_LABEL exists. Nothing is simulated about
 * tantrums at home: PlayReps makes no promise about them.
 */
import { applyMove, farewell, initialChild, tick } from '../child/model';
import { BLOCKS, DRAWING } from '../child/scenes';
import { codeSentence } from '../coding/classify';
import { EXAMPLES } from '../coding/examples';
import { addDays, addSession, emptyProgress, type Progress } from '../progress/history';
import { NORM_SECONDS, summarizeRound } from '../progress/targets';
import type { Code, CodedSentence, RoundResult } from '../types';

export const DEMO_LABEL = 'DEMO DATA - simulated family';

export interface DemoDay {
  day: number;
  date: string;
  result: RoundResult;
  farewell: string;
}

/** mulberry32: a small seeded generator of numbers in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * What the synthetic parent intends to say, per 45 sentences, at six points of the plan.
 * Each week moves its own skill: week 1 fewer questions and commands, week 2 descriptions,
 * week 3 reflections, week 4 specific praise. Days in between are interpolated.
 */
const CURVE_DAYS = [1, 7, 14, 21, 25, 28];
const CURVE = {
  avoid: [34, 16, 9, 5, 2, 1.5],
  description: [3, 8, 14, 13, 13, 13],
  reflection: [1, 3, 6, 13, 13, 13],
  specific_praise: [1, 3, 4, 6, 13, 13],
};
const CURVE_SENTENCES = 45;
/** How the avoid sentences split: this parent mostly asks, sometimes directs, rarely corrects. */
const AVOID_MIX: [Code, number][] = [['question', 0.55], ['command', 0.35], ['criticism', 0.1]];

function onCurve(points: number[], day: number): number {
  const i = Math.max(1, CURVE_DAYS.findIndex((d) => d >= day));
  const [d0, d1] = [CURVE_DAYS[i - 1], CURVE_DAYS[i]];
  return points[i - 1] + ((points[i] - points[i - 1]) * (day - d0)) / (d1 - d0);
}

/** The codes the parent sets out to say today, in a shuffled order. */
function intendedCodes(day: number, rng: () => number): Code[] {
  const total = 40 + Math.floor(rng() * 11);
  // A little day-to-day noise: one sentence more or fewer of each kind.
  const count = (points: number[]): number =>
    Math.max(0, Math.round((onCurve(points, Math.min(day, 28)) * total) / CURVE_SENTENCES) + Math.floor(rng() * 3) - 1);

  const codes: Code[] = [];
  for (const skill of ['description', 'reflection', 'specific_praise'] as const) {
    for (let i = 0; i < count(CURVE[skill]); i++) codes.push(skill);
  }
  for (let i = count(CURVE.avoid); i > 0; i--) {
    let r = rng();
    codes.push((AVOID_MIX.find(([, share]) => (r -= share) < 0) ?? AVOID_MIX[0])[0]);
  }
  // Whatever is left of the session is small talk and "good job".
  while (codes.length < total) codes.push(rng() < 0.5 ? 'neutral' : 'general_praise');

  for (let i = codes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [codes[i], codes[j]] = [codes[j], codes[i]];
  }
  return codes;
}

/** One 300-second session a day for `days` days, starting on startDate (YYYY-MM-DD). */
export function simulateFamily(seed: number, startDate: string, days = 28): { days: DemoDay[]; progress: Progress } {
  const rng = mulberry32(seed);
  const out: DemoDay[] = [];
  let progress = emptyProgress();

  for (let day = 1; day <= days; day++) {
    const scene = day % 2 === 1 ? BLOCKS : DRAWING;
    let child = initialChild(Math.floor(rng() * 2 ** 31));
    const coded: CodedSentence[] = [];

    for (const intended of intendedCodes(day, rng)) {
      child = tick(child, scene).state;
      const pool = EXAMPLES.filter(([, code]) => code === intended);
      const [text, , childLine] = pool[Math.floor(rng() * pool.length)];
      // A reflection example carries the child line it answers; every other sentence is heard against what Mia just said.
      const sentence = codeSentence(text, { childLastSaid: childLine ?? child.lastSaid });
      coded.push(sentence);
      child = applyMove(child, sentence.code, sentence.namedBehavior);
    }

    const date = addDays(startDate, day - 1);
    const result = summarizeRound(coded, NORM_SECONDS);
    // One number is drawn and dropped, so the days that follow keep the sequence the tests were written against.
    rng();
    out.push({ day, date, result, farewell: farewell(child, scene) });
    progress = addSession(progress, result, date, 'practice');
  }
  return { days: out, progress };
}
