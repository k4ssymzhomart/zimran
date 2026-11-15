import { describe, expect, it } from 'vitest';
import { CYCLE_DAYS, PLAN, planDay } from './plan';

/** The seven days after the plan, days 29 to 35. */
const CYCLE = Array.from({ length: 7 }, (_, i) => planDay(29 + i));

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

  it('has only day 28 as the skill check, and calls it that', () => {
    expect(PLAN.filter((d) => d.isMasteryCheck).map((d) => d.day)).toEqual([28]);
    expect(PLAN[27].title).toBe('Skill check');
    expect(PLAN[26].teaser).toContain('skill check');
    for (const d of [...PLAN, ...CYCLE]) expect(`${d.title} ${d.teaser}`).not.toMatch(/mastery/i);
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
    for (const d of [...PLAN, ...CYCLE]) {
      expect(`${d.title} ${d.teaser}`).not.toMatch(/\b(wrong|bad|mistake|fail\w*|should|don't|dont)\b/i);
      expect(`${d.title} ${d.teaser}`).not.toContain('!');
    }
  });

  it('clamps early days', () => {
    expect(planDay(0)).toBe(PLAN[0]);
    expect(planDay(-5)).toBe(PLAN[0]);
    expect(planDay(Number.NaN)).toBe(PLAN[0]);
    expect(planDay(12)).toBe(PLAN[11]);
    expect(planDay(28).isMasteryCheck).toBe(true);
  });
});

// Changed by design: after day 28 there used to be one day, "Keep your five minutes", repeated for good.
// Day 28 is when the first renewal is charged, so the days after it are now a seven-day cycle.
describe('after day 28: a seven-day cycle', () => {
  it('runs days 29 to 35 in this order, with the scenes, live days and skill check it names', () => {
    expect(CYCLE_DAYS).toBe(7);
    expect(CYCLE.map((d) => [d.day, d.title, d.focus])).toEqual([
      [29, 'Hard moment: clean-up time', 'command'],
      [30, 'Live: five minutes with your child', 'description'],
      [31, 'Mixed skills: one of each, twice', 'reflection'],
      [32, 'Hard moment: she says no', 'criticism'],
      [33, 'Live: praise the opposite', 'specific_praise'],
      [34, 'Your weak spot', 'specific_praise'],
      [35, 'Weekly skill check', 'specific_praise'],
    ]);
    expect(CYCLE.map((d) => d.sceneId)).toEqual(['cleanup', undefined, undefined, 'cleanup', undefined, undefined, undefined]);
    expect(CYCLE.map((d) => d.live === true)).toEqual([false, true, false, false, true, false, false]);
    expect(CYCLE.map((d) => d.isMasteryCheck)).toEqual([false, false, false, false, false, false, true]);
    expect(CYCLE.map((d) => d.weakSpot === true)).toEqual([false, false, false, false, false, true, false]);
    for (const d of CYCLE) expect(d).toMatchObject({ week: 5, theme: 'Keep' });
  });

  it('repeats every seven days, and the week number goes on counting', () => {
    for (const first of CYCLE) {
      for (const weeks of [1, 2, 10]) {
        const again = planDay(first.day + 7 * weeks);
        expect(again).toEqual({ ...first, day: first.day + 7 * weeks, week: 5 + weeks });
      }
    }
    expect(planDay(36).title).toBe('Hard moment: clean-up time');
    expect(planDay(42)).toMatchObject({ week: 6, title: 'Weekly skill check', isMasteryCheck: true });
    expect(planDay(43)).toMatchObject({ week: 7, title: 'Hard moment: clean-up time' });
    expect(planDay(29.9).day).toBe(29);
  });

  it('gives every cycle day its own short title and a one-line teaser that names the next day', () => {
    expect(new Set(CYCLE.map((d) => d.title)).size).toBe(7);
    expect(new Set(CYCLE.map((d) => d.teaser)).size).toBe(7);
    for (const d of CYCLE) {
      expect(d.title.length).toBeLessThanOrEqual(36);
      expect(d.teaser.length).toBeLessThanOrEqual(80);
      expect(d.teaser).toMatch(/^Tomorrow: /);
    }
    // Each teaser is about the day that really follows.
    expect(CYCLE[0].teaser).toContain('live');
    expect(CYCLE[1].teaser).toContain('one of each');
    expect(CYCLE[2].teaser).toContain('she says no');
    expect(CYCLE[3].teaser).toContain('praising the opposite');
    expect(CYCLE[4].teaser).toContain('your own numbers');
    expect(CYCLE[5].teaser).toContain('weekly skill check');
    expect(CYCLE[6].teaser).toContain('clean-up time');
  });

  it('promises no second phase and no new clinical content', () => {
    for (const d of [PLAN[27], ...CYCLE, planDay(60)]) {
      expect(`${d.title} ${d.teaser}`).not.toMatch(/phase|new lesson|new skill|unlock|next level|cure|therap|treat/i);
    }
    // Day 28 says what comes next in plain words: the same skills, live and with Mia.
    expect(PLAN[27].teaser).toBe('Next: the same skills, live with your own child and here with Mia.');
  });
});
