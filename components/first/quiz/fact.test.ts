import { describe, expect, it } from 'vitest';
import { MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS, paceTargets } from '../../../lib/progress/targets';
import { BUCKET, type Code } from '../../../lib/types';

/*
 * The fact screen of the quiz (QuizFact.tsx, Figma 49:1273 and 54:1010) says in words what the engine counts toward:
 *
 *   "Clinics count ten, ten, ten in five minutes."
 *   "Ten specific praises, ten reflections, ten descriptions, and at most three questions, commands or corrections."
 *
 * THE WORDING OF THAT SCREEN DEPENDS ON THESE THREE CONSTANTS AND THE BUCKETS. The words are written out by hand,
 * so nothing else keeps them true. If a number or a bucket here has to change, change the sentences in
 * QuizFact.tsx in the same commit.
 */
describe('the numbers behind the fact screen', () => {
  it('"ten, ten, ten": ten of each skill', () => {
    expect(NORM_PER_SKILL).toBe(10);
  });

  it('"at most three questions, commands or corrections"', () => {
    expect(MAX_AVOID_5MIN).toBe(3);
  });

  it('"specific praises" and "questions, commands or corrections": the codes each count takes', () => {
    const codes = (bucket: string): Code[] => (Object.keys(BUCKET) as Code[]).filter((code) => BUCKET[code] === bucket).sort();
    expect(codes('target')).toEqual(['description', 'reflection', 'specific_praise']);
    expect(codes('avoid')).toEqual(['command', 'criticism', 'question']);
  });

  it('"in five minutes"', () => {
    expect(NORM_SECONDS).toBe(300);
  });

  it('are what a five-minute session is scored against', () => {
    expect(paceTargets(NORM_SECONDS)).toEqual({ specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 });
  });
});
