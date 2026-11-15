import { describe, expect, it } from 'vitest';
import { codeSentence } from '../coding/classify';
import { planDayOf } from '../progress/sessions';
import { DEMO_DAYS, demoMonth, isDemoSession } from './month';

const TODAY = '2026-11-15';
const month = demoMonth(TODAY, (date) => `${date}T19:30:00.000Z`);

describe('the demo month for the jury', () => {
  it('is 27 daily sessions that end yesterday, so today is day 28 of the plan', () => {
    expect(month).toHaveLength(DEMO_DAYS);
    expect(month[0].date).toBe('2026-10-19');
    expect(month.at(-1)?.date).toBe('2026-11-14');
    expect(month.every((s) => s.kind === 'daily' && isDemoSession(s))).toBe(true);
    expect(planDayOf(month, TODAY)).toBe(28);
  });

  it('keeps every sentence with the code the real rules give it, and counts that match them', () => {
    for (const session of month) {
      expect(session.sentences.length).toBeGreaterThan(30);
      for (const s of session.sentences.slice(0, 5)) {
        if (s.code !== 'reflection') expect(codeSentence(s.text).code).toBe(s.code);
      }
      const described = session.sentences.filter((s) => s.code === 'description').length;
      expect(session.counts.description).toBe(described);
    }
  });

  it('marks only its own sessions as demo', () => {
    expect(isDemoSession({ id: 'demo-2026-11-14' })).toBe(true);
    expect(isDemoSession({ id: '0b6c1d2e-real' })).toBe(false);
  });
});
