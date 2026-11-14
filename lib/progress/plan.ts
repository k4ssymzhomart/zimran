/**
 * The 28-day plan: one small idea a day, one skill a week.
 * Week 1 Follow (fewer questions and commands), week 2 Describe, week 3 Reflect, week 4 Praise.
 * Day 28 is the mastery check: a full five minutes against the clinic norm.
 */
import type { Lever } from '../types';

export interface PlanDay {
  day: number;
  week: 1 | 2 | 3 | 4;
  theme: 'Follow' | 'Describe' | 'Reflect' | 'Praise';
  focus: Lever;
  title: string;
  /** One line shown at the end of the day about what comes next. */
  teaser: string;
  isMasteryCheck: boolean;
}

const THEMES = ['Follow', 'Describe', 'Reflect', 'Praise'] as const;
export const PLAN_DAYS = 28;

/** [focus, title, teaser], seven per week. */
const DAYS: [Lever, string, string][] = [
  // ----- week 1: Follow -----
  ['question', 'Follow her lead', 'Tomorrow: a way to turn any question into a statement.'],
  ['question', 'Questions into statements', 'Tomorrow: what to say when you are curious about her drawing.'],
  ['question', 'Curious without asking', 'Tomorrow: what to do when she grabs the toy.'],
  ['command', 'Let her choose the game', 'Tomorrow: how to join her play without steering it.'],
  ['command', 'Copy what she does', 'Tomorrow: the quiet move to try during minor whining.'],
  ['question', 'Wait quietly', 'Tomorrow: a whole minute with her fully in charge.'],
  ['command', 'A minute of pure following', 'Tomorrow: week 2 begins, and you become her sports commentator.'],
  // ----- week 2: Describe -----
  ['description', 'Be her commentator', 'Tomorrow: why her hands are more interesting than the toy.'],
  ['description', 'Describe her hands', 'Tomorrow: the two words that start almost every description.'],
  ['description', 'Start with "You are"', 'Tomorrow: describing the calm moments as they happen.'],
  ['description', 'Describe the calm moments', 'Tomorrow: what to say when the tower falls.'],
  ['description', 'Describe when things wobble', 'Tomorrow: two descriptions in a row.'],
  ['description', 'Descriptions back to back', 'Tomorrow: ten descriptions in five minutes. You are closer than you think.'],
  ['description', 'Ten descriptions', 'Tomorrow: week 3 begins with saying her words back.'],
  // ----- week 3: Reflect -----
  ['reflection', 'Say her words back', 'Tomorrow: how to reflect a single word.'],
  ['reflection', 'Reflect a single word', 'Tomorrow: reflecting, plus one small word of your own.'],
  ['reflection', 'Reflect and add a little', 'Tomorrow: what to reflect when she is upset.'],
  ['reflection', 'Reflect big feelings', 'Tomorrow: keeping a reflection from sliding into a question.'],
  ['reflection', 'Reflect, no question mark', 'Tomorrow: a reflection followed by a description.'],
  ['reflection', 'Reflect, then describe', 'Tomorrow: ten reflections in five minutes.'],
  ['reflection', 'Ten reflections', 'Tomorrow: week 4 begins, and "good job" gets an upgrade.'],
  // ----- week 4: Praise -----
  ['specific_praise', 'Name what you liked', 'Tomorrow: praising the gentle hands you want to see more of.'],
  ['specific_praise', 'Praise gentle hands', 'Tomorrow: praising sharing the second it happens.'],
  ['specific_praise', 'Praise sharing', 'Tomorrow: praising waiting, the hardest thing for a small person.'],
  ['specific_praise', 'Praise waiting', 'Tomorrow: praising the opposite of what wears you out.'],
  ['specific_praise', 'Praise the opposite', 'Tomorrow: all three skills together, a dress rehearsal.'],
  ['specific_praise', 'Dress rehearsal', 'Tomorrow: your five-minute mastery check. You are ready.'],
  ['specific_praise', 'Mastery check', 'Next: Phase 2, where your five minutes stay a daily habit.'],
];

export const PLAN: PlanDay[] = DAYS.map(([focus, title, teaser], i) => {
  const week = (Math.floor(i / 7) + 1) as PlanDay['week'];
  return { day: i + 1, week, theme: THEMES[week - 1], focus, title, teaser, isMasteryCheck: i + 1 === PLAN_DAYS };
});

/** The plan for a day number. Before day 1 is day 1; after day 28 the family is in Phase 2. */
export function planDay(day: number): PlanDay {
  const n = Math.floor(day);
  if (n > PLAN_DAYS) {
    return {
      day: n,
      week: 4,
      theme: 'Praise',
      focus: 'specific_praise',
      title: 'Phase 2: keep your five minutes',
      teaser: 'Tomorrow: the same five minutes. Small and daily is what makes it stick.',
      isMasteryCheck: false,
    };
  }
  return PLAN[Math.max(1, n) - 1] ?? PLAN[0];
}
