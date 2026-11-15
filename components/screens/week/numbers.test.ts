import { describe, expect, it } from 'vitest';
import type { Code, Counts, SavedSession } from '../../../lib/types';
import { perMinute, perSession, planDays, short, shownWeek, skillOf } from './numbers';
import { dayMonth, shiftMonth } from '../streak/dates';

function counts(n: Partial<Record<Exclude<Code, 'unknown'>, number>> = {}): Counts {
  const c = { specific_praise: 0, reflection: 0, description: 0, general_praise: 0, neutral: 0, question: 0, command: 0, criticism: 0, ...n };
  return { ...c, target: c.specific_praise + c.reflection + c.description, avoid: c.question + c.command + c.criticism };
}

let nextId = 0;
function session(date: string, over: Partial<SavedSession> = {}): SavedSession {
  return {
    id: `s${++nextId}`,
    kind: 'daily',
    startedAt: `${date}T18:00:00.000Z`,
    date,
    durationSec: 300,
    sceneId: 'blocks',
    partner: 'mia',
    counts: counts(),
    targets: { specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 },
    met: false,
    input: 'typed',
    sentences: [],
    ...over,
  };
}

describe('week numbers', () => {
  it('reads this week once it has a session, per session against last week', () => {
    // Friday 13 November 2026: the week runs Monday 9 to Sunday 15.
    const sessions = [
      session('2026-11-03', { counts: counts({ question: 9 }) }),
      session('2026-11-10', { counts: counts({ question: 4 }) }),
      session('2026-11-12', { counts: counts({ question: 6 }) }),
    ];
    const week = shownWeek(sessions, '2026-11-13');
    expect(week.current).toBe(true);
    expect(perSession(week.now, 'avoid')).toBe(5);
    expect(perSession(week.before, 'avoid')).toBe(9);
  });

  it('reads last week while this week has no session yet', () => {
    const sessions = [session('2026-11-04'), session('2026-11-10')];
    const week = shownWeek(sessions, '2026-11-16');
    expect(week.current).toBe(false);
    expect(week.now.from).toBe('2026-11-09');
    expect(week.now.sessions).toBe(1);
    expect(week.before.sessions).toBe(1);
  });

  it('has no per-session number for an empty week', () => {
    const { now } = shownWeek([], '2026-11-13');
    expect(perSession(now, 'specific_praise')).toBeNull();
  });

  it('maps a plan focus to the number it moves', () => {
    expect(skillOf('question')).toBe('avoid');
    expect(skillOf('command')).toBe('avoid');
    expect(skillOf('description')).toBe('description');
  });

  it('writes at most one decimal', () => {
    expect(short(4)).toBe('4');
    expect(short(2.5)).toBe('2.5');
    expect(short(1 / 3)).toBe('0.3');
  });
});

describe('the 28 days', () => {
  it('counts day 1 from the first session and stops at day 28', () => {
    const sessions = [
      session('2026-11-09', { counts: counts({ specific_praise: 5 }), met: true }),
      session('2026-11-09'),
      session('2026-11-20', { met: true }),
      session('2026-12-06', { counts: counts({ specific_praise: 11 }), durationSec: 300 }),
      session('2026-12-07'),
    ];
    const plan = planDays(sessions);
    expect(plan?.sessions).toHaveLength(4);
    expect(plan?.first.date).toBe('2026-11-09');
    expect(plan?.first.sessions).toHaveLength(2);
    expect(plan?.last).toMatchObject({ date: '2026-12-06', day: 28 });
    expect(plan?.paceDays).toBe(2);
    // Five praises over two five-minute sessions: half a praise a minute.
    expect(perMinute(plan!.first.sessions, 'specific_praise')).toBe(0.5);
    expect(perMinute(plan!.last.sessions, 'specific_praise')).toBeCloseTo(2.2);
  });

  it('has nothing without sessions, and no rate without time', () => {
    expect(planDays([])).toBeNull();
    expect(perMinute([session('2026-11-09', { durationSec: 0 })], 'reflection')).toBeNull();
  });
});

describe('dates without the clock', () => {
  it('moves months across years', () => {
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('reads a day as day and month', () => {
    expect(dayMonth('2026-11-09')).toBe('9 November');
  });
});
