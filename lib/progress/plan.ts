/**
 * The 28-day plan: one small idea a day, one skill a week.
 * Week 1 Follow (fewer questions and commands), week 2 Describe, week 3 Reflect, week 4 Praise.
 * Day 28 is the skill check: a full five minutes against the clinic norm.
 * After day 28 a seven-day cycle keeps the same three skills in use: harder moments with Mia, live play
 * with the parent's own child, the family's own weak spot, and a weekly skill check. No new skill is taught.
 */
import type { Lever } from '../types';

export interface PlanDay {
  day: number;
  /** 1 to 4 inside the plan; 5, 6, ... for each seven days after it. */
  week: number;
  /** 'Keep' is every day after day 28. */
  theme: 'Follow' | 'Describe' | 'Reflect' | 'Praise' | 'Keep';
  focus: Lever;
  title: string;
  /** One line shown at the end of the day about what comes next. */
  teaser: string;
  /** Day 28 and each weekly skill check after it. (The field keeps its first name; the screens call the day "Skill check".) */
  isMasteryCheck: boolean;
  /** The scene this day is played in, when the day asks for one. Left out, the usual rotation decides. */
  sceneId?: string;
  /** The day is meant for live play with the parent's own child. */
  live?: boolean;
  /** "Your weak spot": `focus` is only a fallback, the family's own numbers choose (see todayFocus in history.ts). */
  weakSpot?: boolean;
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
  ['command', 'A minute of pure following', 'Tomorrow: week 2 begins, and you become her sportscaster.'],
  // ----- week 2: Describe -----
  ['description', 'Be her sportscaster', 'Tomorrow: why her hands are more interesting than the toy.'],
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
  ['specific_praise', 'Dress rehearsal', 'Tomorrow: your five-minute skill check. You are ready.'],
  ['specific_praise', 'Skill check', 'Next: the same skills, live with your own child and here with Mia.'],
];

export const PLAN: PlanDay[] = DAYS.map(([focus, title, teaser], i) => {
  const week = Math.floor(i / 7) + 1;
  return { day: i + 1, week, theme: THEMES[week - 1], focus, title, teaser, isMasteryCheck: i + 1 === PLAN_DAYS };
});

/**
 * The week after day 28, repeated: days 29-35, 36-42, and so on. Day 28 is when the first renewal is charged,
 * so the days after it have to be worth opening. They are the same three skills in harder places, not new content.
 * [focus, title, teaser, extra]
 */
const CYCLE: [Lever, string, string, Partial<PlanDay>][] = [
  ['command', 'Hard moment: clean-up time', 'Tomorrow: five minutes live, with your own child.', { sceneId: 'cleanup' }],
  ['description', 'Live: five minutes with your child', 'Tomorrow: back with Mia, one of each skill, twice.', { live: true }],
  ['reflection', 'Mixed skills: one of each, twice', 'Tomorrow: a hard moment with Mia, when she says no.', {}],
  ['criticism', 'Hard moment: she says no', 'Tomorrow: live again, praising the opposite.', { sceneId: 'cleanup' }],
  ['specific_praise', 'Live: praise the opposite', 'Tomorrow: the skill your own numbers point to.', { live: true }],
  ['specific_praise', 'Your weak spot', 'Tomorrow: your weekly skill check, a full five minutes.', { weakSpot: true }],
  ['specific_praise', 'Weekly skill check', 'Tomorrow: the week starts over, with clean-up time.', { isMasteryCheck: true }],
];
export const CYCLE_DAYS = CYCLE.length;

/** The plan for a day number. Before day 1 is day 1; after day 28 the seven-day cycle runs, week 5, 6, and on. */
export function planDay(day: number): PlanDay {
  const n = Math.floor(day);
  if (n > PLAN_DAYS) {
    const past = n - PLAN_DAYS - 1;
    const [focus, title, teaser, extra] = CYCLE[past % CYCLE_DAYS];
    return { day: n, week: 5 + Math.floor(past / CYCLE_DAYS), theme: 'Keep', focus, title, teaser, isMasteryCheck: false, ...extra };
  }
  return PLAN[Math.max(1, n) - 1] ?? PLAN[0];
}
