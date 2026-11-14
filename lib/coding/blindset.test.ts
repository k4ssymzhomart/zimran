import { describe, expect, it } from 'vitest';
import { codeTurn } from './classify';
import { BLINDSET } from './blindset';

/**
 * History of this set, for anyone comparing the number printed below with the one on /jury and in the README:
 * on its first run, before any rule was changed, 72 of the 80 turns (90%) were coded as expected.
 * The eight misses led to generic fixes in classify.ts, and the set is now 80 of 80, so it is no longer blind.
 * The 72 is the honest estimate for unseen phrasing; the 80 only guards against regressions.
 */
const FIRST_RUN_CODED = 72;
/** Reached after the generic fixes; the guard sits five points lower so it is not a brittle exact match. */
const REACHED = 80 / 80;

describe('blind set', () => {
  it('has 80 turns', () => {
    expect(BLINDSET.length).toBe(80);
  });

  it('codes the blind set within five points of the share reached', () => {
    const misses: string[] = [];
    for (const [turn, expected, child] of BLINDSET) {
      const got = codeTurn(turn, { childLastSaid: child ?? null }).map((c) => c.code);
      if (JSON.stringify(got) !== JSON.stringify(expected)) misses.push(`${turn} -> ${got.join(',')} (expected ${expected.join(',')})`);
    }
    const share = 1 - misses.length / BLINDSET.length;
    console.log(`blind set coded as expected: ${BLINDSET.length - misses.length}/${BLINDSET.length} (first run, before any fix: ${FIRST_RUN_CODED}/${BLINDSET.length})`);
    for (const m of misses) console.log('  miss: ' + m);
    expect(share).toBeGreaterThanOrEqual(REACHED - 0.05);
  });
});
