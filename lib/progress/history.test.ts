import { describe, expect, it } from 'vitest';
import type { CodedSentence, Code } from '../types';
import { BUCKET } from '../types';
import {
  addCheckin, addDays, addSession, calmTrend, dayNumber, emptyProgress, masteryShare, parseProgress,
  skillTrend, streak, type Progress,
} from './history';
import { summarizeRound } from './targets';

/** A round with the given number of sentences per code, through the real summary. */
function round(n: Partial<Record<Code, number>>, seconds = 300) {
  const coded: CodedSentence[] = [];
  for (const [code, count] of Object.entries(n) as [Code, number][]) {
    for (let i = 0; i < count; i++) coded.push({ text: '', code, bucket: BUCKET[code], confidence: 1, rule: 'test' });
  }
  return summarizeRound(coded, seconds);
}

const NORM = round({ specific_praise: 10, reflection: 10, description: 10, question: 2 });
const EARLY = round({ description: 5, question: 12, command: 6 });

function played(dates: string[]): Progress {
  return dates.reduce((p, d) => addSession(p, EARLY, d, 'practice'), emptyProgress());
}

describe('dates', () => {
  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('numbers days from the first session', () => {
    expect(dayNumber(emptyProgress(), '2026-11-14')).toBe(1);
    const p = played(['2026-11-14']);
    expect(dayNumber(p, '2026-11-14')).toBe(1);
    expect(dayNumber(p, '2026-12-11')).toBe(28);
    expect(dayNumber(p, '2026-11-01')).toBe(1);
  });
});

describe('adding', () => {
  it('sets the start date once and never mutates', () => {
    const empty = emptyProgress();
    const one = addSession(empty, EARLY, '2026-11-14', 'practice');
    const two = addSession(one, NORM, '2026-11-15', 'live');
    expect(empty.sessions).toHaveLength(0);
    expect(one.sessions).toHaveLength(1);
    expect(two.startDate).toBe('2026-11-14');
    expect(two.sessions[1]).toMatchObject({ date: '2026-11-15', seconds: 300, met: true, mode: 'live' });
  });

  it('keeps one check-in per day', () => {
    const p = addCheckin(addCheckin(addCheckin(emptyProgress(), '2026-11-14', 3), '2026-11-15', 2), '2026-11-14', 1);
    expect(p.checkins).toHaveLength(2);
    expect(p.checkins.find((c) => c.date === '2026-11-14')?.tantrums).toBe(1);
  });
});

describe('streak', () => {
  const run = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDays(from, i));

  it('is zero with no sessions', () => {
    expect(streak(emptyProgress(), '2026-11-14')).toEqual({ days: 0, freeDayUsed: false, activeToday: false });
  });

  it('counts consecutive days including today', () => {
    expect(streak(played(run('2026-11-10', 5)), '2026-11-14')).toEqual({ days: 5, freeDayUsed: false, activeToday: true });
  });

  it('keeps the streak while today is still open', () => {
    expect(streak(played(run('2026-11-10', 4)), '2026-11-14')).toEqual({ days: 4, freeDayUsed: false, activeToday: false });
  });

  it('forgives one missed day without counting it', () => {
    const p = played(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14']);
    expect(streak(p, '2026-11-14')).toEqual({ days: 4, freeDayUsed: true, activeToday: true });
  });

  it('ends at a second miss within seven days', () => {
    const p = played(['2026-11-08', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14']);
    expect(streak(p, '2026-11-14').days).toBe(4);
  });

  it('ends at two missed days in a row and does not spend the free day there', () => {
    const p = played(['2026-11-09', '2026-11-10', '2026-11-13', '2026-11-14']);
    expect(streak(p, '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: true });
  });

  it('forgives a second miss once seven days have passed', () => {
    const dates = run('2026-11-01', 14).filter((d) => d !== '2026-11-04' && d !== '2026-11-11');
    expect(streak(played(dates), '2026-11-14')).toEqual({ days: 12, freeDayUsed: true, activeToday: true });
    const close = run('2026-11-01', 14).filter((d) => d !== '2026-11-06' && d !== '2026-11-11');
    expect(streak(played(close), '2026-11-14').days).toBe(7);
  });
});

describe('trend and mastery', () => {
  it('uses the best session of each day, per minute', () => {
    let p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    p = addSession(p, NORM, '2026-11-14', 'practice');
    p = addSession(p, round({ description: 3, question: 1 }, 60), '2026-11-15', 'live');
    expect(skillTrend(p)).toEqual([
      { date: '2026-11-14', specific_praise: 2, reflection: 2, description: 2, avoid: 0.4 },
      // Live play does not measure reflections: the day has no reading, not a zero.
      { date: '2026-11-15', specific_praise: 0, reflection: null, description: 3, avoid: 1 },
    ]);
  });

  it('measures the latest day against the clinic pace', () => {
    expect(masteryShare(emptyProgress())).toEqual({ specific_praise: 0, reflection: 0, description: 0, avoidOk: false, overall: 0 });
    expect(masteryShare(addSession(emptyProgress(), NORM, '2026-11-14', 'practice'))).toEqual({
      specific_praise: 1, reflection: 1, description: 1, avoidOk: true, overall: 1,
    });
    const early = masteryShare(addSession(emptyProgress(), EARLY, '2026-11-14', 'practice'));
    expect(early).toMatchObject({ specific_praise: 0, reflection: 0, description: 0.5, avoidOk: false });
    expect(early.overall).toBeCloseTo(1 / 6);
  });

  it('leaves reflections out after a day of live play instead of showing zero', () => {
    const liveDay = round({ specific_praise: 10, description: 5, question: 1 });
    const share = masteryShare(addSession(emptyProgress(), liveDay, '2026-11-14', 'live'));
    expect(share).toMatchObject({ specific_praise: 1, reflection: null, description: 0.5, avoidOk: true });
    // The average is over the two skills that were measured.
    expect(share.overall).toBeCloseTo(0.75);
  });

  it('does not let a short practice round hide a strong live session of the same day', () => {
    const strongLive = round({ specific_praise: 10, description: 10 });
    const weakPractice = round({ specific_praise: 2, reflection: 4, description: 2 });
    for (const order of [['live', 'practice'], ['practice', 'live']] as const) {
      let p = emptyProgress();
      for (const mode of order) p = addSession(p, mode === 'live' ? strongLive : weakPractice, '2026-11-14', mode);
      expect(skillTrend(p)).toEqual([{ date: '2026-11-14', specific_praise: 2, reflection: null, description: 2, avoid: 0 }]);
    }
  });

  it('lets practice stand when it matches the live session on the skills both measure', () => {
    const live = round({ specific_praise: 5, description: 5 });
    const practice = round({ specific_praise: 5, reflection: 6, description: 5 });
    for (const order of [['live', 'practice'], ['practice', 'live']] as const) {
      let p = emptyProgress();
      for (const mode of order) p = addSession(p, mode === 'live' ? live : practice, '2026-11-14', mode);
      expect(skillTrend(p)[0]).toMatchObject({ specific_praise: 1, reflection: 1.2, description: 1 });
    }
    // Two live sessions on one day: the stronger one stands.
    let twoLive = addSession(emptyProgress(), round({ description: 3 }), '2026-11-14', 'live');
    twoLive = addSession(twoLive, round({ specific_praise: 10, description: 10 }), '2026-11-14', 'live');
    expect(skillTrend(twoLive)[0]).toMatchObject({ specific_praise: 2, reflection: null, description: 2 });
  });

  it('caps each skill at 1', () => {
    const p = addSession(emptyProgress(), round({ description: 30 }), '2026-11-14', 'live');
    expect(masteryShare(p).description).toBe(1);
  });

  it('averages tantrum buckets per week from the start date', () => {
    let p = played(['2026-11-14']);
    p = addCheckin(p, '2026-11-14', 3);
    p = addCheckin(p, '2026-11-20', 2);
    p = addCheckin(p, '2026-11-21', 1);
    p = addCheckin(p, '2026-12-05', 0);
    expect(calmTrend(p)).toEqual([
      { week: 1, average: 2.5 },
      { week: 2, average: 1 },
      { week: 3, average: null },
      { week: 4, average: 0 },
    ]);
    expect(calmTrend(emptyProgress())).toEqual([]);
  });
});

describe('parseProgress', () => {
  const saved = addCheckin(addSession(emptyProgress(), NORM, '2026-11-14', 'live'), '2026-11-14', 2);

  it('round-trips through JSON, as an object or a string', () => {
    expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseProgress(JSON.stringify(saved))).toEqual(saved);
  });

  it('starts fresh on anything invalid', () => {
    const broken: unknown[] = [
      null, undefined, 42, 'not json', [], {},
      { ...saved, v: 2 },
      { ...saved, startDate: '14.11.2026' },
      { ...saved, startDate: '2026-02-31' },
      { ...saved, sessions: [{ ...saved.sessions[0], counts: { target: 1 } }] },
      { ...saved, sessions: [{ ...saved.sessions[0], mode: 'demo' }] },
      { ...saved, checkins: [{ date: '2026-11-14', tantrums: 7 }] },
    ];
    for (const b of broken) expect(parseProgress(b)).toEqual(emptyProgress());
  });
});
