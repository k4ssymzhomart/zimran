import { describe, expect, it } from 'vitest';
import type { Habit, Lever } from '../../lib/types';
import { habitFor, habitLabel, leverLabel } from './planFromAnswersRules';
import type { MomentId } from './quiz/moments';

const HABITS: Habit[] = ['gentle', 'sharing', 'patient', 'tidy'];
const LEVERS: Lever[] = ['question', 'command', 'criticism', 'specific_praise', 'reflection', 'description'];
const MOMENTS: MomentId[] = ['mornings', 'mealtimes', 'leaving', 'screens_off', 'bedtime', 'sharing'];

/** Words the interface never says (docs/build/FOUNDATION.md, section 4). */
const NEVER = /\b(wrong|bad|mistake|should|don't)\b/i;

describe('habitLabel', () => {
  it('names each behavior the way the plan row shows it', () => {
    expect(habitLabel('gentle')).toBe('Being gentle');
    expect(habitLabel('sharing')).toBe('Sharing');
    expect(habitLabel('patient')).toBe('Being patient');
    expect(habitLabel('tidy')).toBe('Tidying up');
  });

  it('gives every behavior its own calm label', () => {
    const labels = HABITS.map(habitLabel);
    expect(new Set(labels).size).toBe(HABITS.length);
    for (const label of labels) expect(label).not.toMatch(NEVER);
  });
});

describe('leverLabel', () => {
  it('names each lever the way the plan row shows it', () => {
    expect(leverLabel('question')).toBe('Swap questions');
    expect(leverLabel('command')).toBe('Swap instructions');
    expect(leverLabel('criticism')).toBe('Swap corrections');
    expect(leverLabel('specific_praise')).toBe('Name what you liked');
    expect(leverLabel('reflection')).toBe('Say the words back');
    expect(leverLabel('description')).toBe('Describe what you see');
  });

  it('gives every lever its own label, short enough for one row', () => {
    const labels = LEVERS.map(leverLabel);
    expect(new Set(labels).size).toBe(LEVERS.length);
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(22);
  });

  it('reads the same with Mia and with Leo, and stays calm', () => {
    for (const label of LEVERS.map(leverLabel)) {
      expect(label).not.toMatch(/\b(she|he|her|him|his|hers|Mia|Leo)\b/i);
      expect(label).not.toMatch(NEVER);
    }
  });
});

describe('habitFor', () => {
  it('has nothing to say when no moment was picked', () => {
    expect(habitFor([])).toBeNull();
  });

  it('turns each moment alone into its behavior', () => {
    expect(habitFor(['mornings'])).toBe('tidy');
    expect(habitFor(['mealtimes'])).toBe('gentle');
    expect(habitFor(['leaving'])).toBe('tidy');
    expect(habitFor(['screens_off'])).toBe('patient');
    expect(habitFor(['bedtime'])).toBe('patient');
    expect(habitFor(['sharing'])).toBe('sharing');
  });

  it('knows every moment the quiz offers', () => {
    for (const moment of MOMENTS) expect(HABITS).toContain(habitFor([moment]));
  });

  it('reaches every behavior from some moment', () => {
    expect(new Set(MOMENTS.map((moment) => habitFor([moment])))).toEqual(new Set(HABITS));
  });

  it('reads the Figma example, screens off and bedtime, as being patient', () => {
    expect(habitFor(['screens_off', 'bedtime'])).toBe('patient');
    expect(habitFor(['bedtime', 'screens_off'])).toBe('patient');
  });

  it('puts first the behavior most of the moments point to, wherever they sit in the list', () => {
    expect(habitFor(['mealtimes', 'screens_off', 'bedtime'])).toBe('patient');
    expect(habitFor(['screens_off', 'mealtimes', 'bedtime'])).toBe('patient');
    expect(habitFor(['sharing', 'mornings', 'leaving'])).toBe('tidy');
    expect(habitFor(MOMENTS)).toBe('tidy');
  });

  it('keeps the earlier moment when two behaviors are level', () => {
    expect(habitFor(['mealtimes', 'sharing'])).toBe('gentle');
    expect(habitFor(['sharing', 'mealtimes'])).toBe('sharing');
    expect(habitFor(['bedtime', 'mornings', 'leaving', 'screens_off'])).toBe('patient');
    expect(habitFor(['mornings', 'bedtime', 'leaving', 'screens_off'])).toBe('tidy');
  });

  it('counts a moment once however often it is listed', () => {
    expect(habitFor(['sharing', 'mealtimes', 'mealtimes'])).toBe('sharing');
    expect(habitFor(['bedtime', 'bedtime', 'mornings', 'leaving'])).toBe('tidy');
  });

  it('leaves out an id it does not know and makes nothing up', () => {
    expect(habitFor(['leaving the playground'])).toBeNull();
    expect(habitFor(['', 'Bedtime', 'BEDTIME'])).toBeNull();
    expect(habitFor(['naps', 'bedtime'])).toBe('patient');
    expect(habitFor(['naps', 'bath', 'sharing'])).toBe('sharing');
  });

  it('is not fooled by names every object carries', () => {
    expect(habitFor(['constructor', 'toString', '__proto__', 'hasOwnProperty'])).toBeNull();
    expect(habitFor(['constructor', 'mealtimes'])).toBe('gentle');
  });

  it('leaves the list it was given as it was', () => {
    const picked = Object.freeze(['bedtime', 'mornings', 'bedtime']);
    expect(habitFor(picked)).toBe('patient');
    expect(picked).toEqual(['bedtime', 'mornings', 'bedtime']);
  });
});
