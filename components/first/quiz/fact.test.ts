import { describe, expect, it } from 'vitest';
import { MAX_AVOID_5MIN, NORM_PER_SKILL, NORM_SECONDS, paceTargets } from '../../../lib/progress/targets';

/*
 * The fact screen of the quiz (QuizFact.tsx, Figma 49:1273 and 54:1010) says in words what the engine counts toward:
 *
 *   "Clinics count ten, ten, ten in five minutes."
 *   "Ten praises, ten reflections, ten descriptions, and at most three questions or commands."
 *
 * THE WORDING OF THAT SCREEN DEPENDS ON THESE THREE CONSTANTS. The words are written out by hand, so nothing else
 * keeps them true. If a number here has to change, change the sentences in QuizFact.tsx in the same commit.
 */
describe('the numbers behind the fact screen', () => {
  it('"ten, ten, ten": ten of each skill', () => {
    expect(NORM_PER_SKILL).toBe(10);
  });

  it('"at most three questions or commands"', () => {
    expect(MAX_AVOID_5MIN).toBe(3);
  });

  it('"in five minutes"', () => {
    expect(NORM_SECONDS).toBe(300);
  });

  it('are what a five-minute session is scored against', () => {
    expect(paceTargets(NORM_SECONDS)).toEqual({ specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 });
  });
});
