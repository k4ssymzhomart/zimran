import { describe, expect, it } from 'vitest';
import { BLOCKS, DRAWING } from '../child/scenes';
import { addDays, masteryShare, streak } from '../progress/history';
import { DEMO_LABEL, simulateFamily, type DemoDay } from './simulate';

const START = '2026-11-14';
const SEEDS = [1, 2, 3, 4, 5];

const perMinute = (days: DemoDay[], key: 'specific_praise' | 'reflection' | 'description' | 'avoid'): number =>
  days.reduce((sum, d) => sum + (d.result.counts[key] * 60) / d.result.seconds, 0) / days.length;

describe('simulated family', () => {
  it('is labeled as demo data', () => {
    expect(DEMO_LABEL).toBe('DEMO DATA - simulated family');
  });

  it('is deterministic for a seed', () => {
    expect(simulateFamily(7, START)).toEqual(simulateFamily(7, START));
  });

  it('differs between seeds', () => {
    expect(simulateFamily(1, START).days).not.toEqual(simulateFamily(2, START).days);
  });

  it('gives 28 five-minute sessions of 40 to 50 sentences, and honors a shorter run', () => {
    const { days, progress } = simulateFamily(1, START);
    expect(days).toHaveLength(28);
    expect(progress.sessions).toHaveLength(28);
    // Nothing is simulated about tantrums at home.
    expect(progress.checkins).toHaveLength(0);
    expect(progress.startDate).toBe(START);
    for (const d of days) {
      const c = d.result.counts;
      const said = c.target + c.avoid + c.neutral + c.general_praise;
      expect(d.result.seconds).toBe(300);
      expect(said).toBeGreaterThanOrEqual(40);
      expect(said).toBeLessThanOrEqual(50);
    }
    expect(simulateFamily(1, START, 7).days).toHaveLength(7);
  });

  it('runs on consecutive dates across the month boundary', () => {
    const { days } = simulateFamily(1, START);
    days.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
      expect(d.date).toBe(addDays(START, i));
    });
    expect(days[16].date).toBe('2026-11-30');
    expect(days[17].date).toBe('2026-12-01');
    expect(days[27].date).toBe('2026-12-11');
  });

  it.each(SEEDS)('seed %i starts far from the norm and ends on it', (seed) => {
    const { days, progress } = simulateFamily(seed, START);
    const [first, last] = [days[0], days[27]];
    expect(first.result.met).toBe(false);
    expect(['question', 'command', 'criticism']).toContain(first.result.lever);
    expect(last.result.met).toBe(true);
    expect(last.result.lever).toBeNull();
    expect(masteryShare(progress)).toMatchObject({ overall: 1, avoidOk: true });
  });

  it.each(SEEDS)('seed %i: fewer avoids and more of every skill in week 4 than in week 1', (seed) => {
    const { days } = simulateFamily(seed, START);
    const [week1, week4] = [days.slice(0, 7), days.slice(21)];
    expect(perMinute(week4, 'avoid')).toBeLessThan(perMinute(week1, 'avoid'));
    for (const skill of ['specific_praise', 'reflection', 'description'] as const) {
      expect(perMinute(week4, skill)).toBeGreaterThan(perMinute(week1, skill));
    }
  });

  it('follows the weekly themes: each skill makes its biggest gain in its own week', () => {
    const { days } = simulateFamily(1, START);
    const weeks = [0, 7, 14, 21].map((from) => days.slice(from, from + 7));
    const gain = (key: Parameters<typeof perMinute>[1], week: number) =>
      perMinute(weeks[week], key) - perMinute(weeks[week - 1], key);
    expect(gain('description', 1)).toBeGreaterThan(gain('reflection', 1));
    expect(gain('reflection', 2)).toBeGreaterThan(gain('description', 2));
    expect(gain('specific_praise', 3)).toBeGreaterThan(gain('reflection', 3));
  });

  it('keeps a 28-day streak', () => {
    const { days, progress } = simulateFamily(3, START);
    expect(streak(progress, days[27].date)).toEqual({ days: 28, freeDayUsed: false, activeToday: true });
  });

  it('lets the child answer: a cold goodbye on day 1, a warm one on day 28', () => {
    const { days } = simulateFamily(1, START);
    expect(days[0].farewell).toBe(BLOCKS.farewell.low);
    expect(days[27].farewell).toBe(DRAWING.farewell.high);
  });
});
