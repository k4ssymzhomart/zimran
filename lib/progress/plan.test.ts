import { describe, expect, it } from 'vitest';
import { PLAN, planDay } from './plan';

describe('28-day plan', () => {
  it('has 28 numbered days in four weekly themes', () => {
    expect(PLAN).toHaveLength(28);
    expect(PLAN.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    const themes = ['Follow', 'Describe', 'Reflect', 'Praise'];
    for (const d of PLAN) {
      expect(d.week).toBe(Math.ceil(d.day / 7));
      expect(d.theme).toBe(themes[d.week - 1]);
    }
  });

  it('focuses each week on its skill', () => {
    const focus = (week: number) => new Set(PLAN.filter((d) => d.week === week).map((d) => d.focus));
    expect(focus(1)).toEqual(new Set(['question', 'command']));
    expect(focus(2)).toEqual(new Set(['description']));
    expect(focus(3)).toEqual(new Set(['reflection']));
    expect(focus(4)).toEqual(new Set(['specific_praise']));
  });

  it('has only day 28 as the mastery check', () => {
    expect(PLAN.filter((d) => d.isMasteryCheck).map((d) => d.day)).toEqual([28]);
  });

  it('gives every day its own short title and a one-line teaser', () => {
    expect(new Set(PLAN.map((d) => d.title)).size).toBe(28);
    expect(new Set(PLAN.map((d) => d.teaser)).size).toBe(28);
    for (const d of PLAN) {
      expect(d.title.length).toBeLessThanOrEqual(30);
      expect(d.teaser.length).toBeLessThanOrEqual(80);
      expect(d.teaser).toMatch(/^(Tomorrow|Next): /);
      expect(d.teaser).not.toContain('\n');
    }
  });

  it('never scolds', () => {
    for (const d of [...PLAN, planDay(29)]) {
      expect(`${d.title} ${d.teaser}`).not.toMatch(/\b(wrong|bad|mistake|should|don't|dont)\b/i);
    }
  });

  it('clamps early days and moves on to Phase 2 after day 28', () => {
    expect(planDay(0)).toBe(PLAN[0]);
    expect(planDay(-5)).toBe(PLAN[0]);
    expect(planDay(Number.NaN)).toBe(PLAN[0]);
    expect(planDay(12)).toBe(PLAN[11]);
    expect(planDay(28).isMasteryCheck).toBe(true);
    const later = planDay(40);
    expect(later).toMatchObject({ day: 40, week: 4, theme: 'Praise', focus: 'specific_praise', isMasteryCheck: false });
    expect(later.title.startsWith('Phase 2')).toBe(true);
  });
});
