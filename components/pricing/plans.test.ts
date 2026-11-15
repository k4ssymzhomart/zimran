import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, PLANS, isPlanId, lengthOf, longDate, momentLine, perDayOf, planOf, priceOf, renewalDay, termsLine } from './plans';

describe('the two plans', () => {
  it('opens on 4 weeks', () => {
    expect(DEFAULT_PLAN).toBe('four_weeks');
    expect(PLANS.map((plan) => plan.id)).toEqual(['four_weeks', 'twelve_weeks']);
  });

  it('prints the prices the checkout charges, and the price of a day from them', () => {
    const four = planOf('four_weeks');
    const twelve = planOf('twelve_weeks');
    expect([lengthOf(four), priceOf(four), perDayOf(four)]).toEqual(['4 weeks', '$29', '$1.04 a day']);
    expect([lengthOf(twelve), priceOf(twelve), perDayOf(twelve)]).toEqual(['12 weeks', '$69', '$0.82 a day']);
  });

  it('says what the 12 weeks hold, and sells no week that is not built', () => {
    expect(planOf('twelve_weeks').detail).toBe('Weeks 1–4 with Mia, weeks 5–8 live with your child');
    expect(planOf('four_weeks').detail).toBeNull();
    for (const plan of PLANS) expect(plan.detail ?? '').not.toMatch(/9|10|11|12/);
  });

  it('knows a plan id from anything else a link can carry', () => {
    expect(isPlanId('four_weeks')).toBe(true);
    expect(isPlanId('twelve_weeks')).toBe(true);
    for (const other of ['free', '', 'FOUR_WEEKS', null, undefined, 4]) expect(isPlanId(other)).toBe(false);
  });
});

describe('the renewal date', () => {
  it('is today plus the term', () => {
    expect(renewalDay('2026-11-15', planOf('four_weeks'))).toBe('2026-12-13');
    expect(renewalDay('2026-11-15', planOf('twelve_weeks'))).toBe('2027-02-07');
    expect(renewalDay('2028-02-01', planOf('four_weeks'))).toBe('2028-02-29'); // a leap year
    expect(renewalDay('2026-12-31', planOf('four_weeks'))).toBe('2027-01-28'); // across the new year
  });

  it('is written as day, month, year', () => {
    expect(longDate('2026-12-13')).toBe('13 December 2026');
    expect(longDate('2027-02-07')).toBe('7 February 2027');
  });

  it('makes the terms under the plans', () => {
    expect(termsLine(planOf('four_weeks'), '2026-11-15')).toBe('$29 every 4 weeks. Renews 13 December 2026. Cancel anytime.');
    expect(termsLine(planOf('twelve_weeks'), '2026-11-15')).toBe('$69 every 12 weeks. Renews 7 February 2027. Cancel anytime.');
    expect(termsLine(planOf('four_weeks'), null)).toBe('$29 every 4 weeks. Cancel anytime.');
  });
});

describe('the line over the headline', () => {
  it('is built from the daily moment and the scene', () => {
    expect(momentLine('After dinner', 'blocks')).toBe('Five minutes after dinner, with blocks.');
    expect(momentLine('Before bath', 'drawing')).toBe('Five minutes before bath, with crayons.');
  });

  it('is not there without a daily moment', () => {
    expect(momentLine(null, 'blocks')).toBeNull();
    expect(momentLine('   ', 'blocks')).toBeNull();
  });

  it('tidies a moment the parent typed, and keeps its own capitals', () => {
    expect(momentLine('  When  Dad gets home. ', 'blocks')).toBe('Five minutes when Dad gets home, with blocks.');
  });

  it('names no toy for a scene it does not know', () => {
    expect(momentLine('After dinner', '')).toBe('Five minutes after dinner.');
    expect(momentLine('After dinner', 'no-such-scene')).toBe('Five minutes after dinner.');
  });
});
