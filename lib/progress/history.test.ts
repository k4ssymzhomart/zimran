import { describe, expect, it } from 'vitest';
import type { CodedSentence, Code } from '../types';
import { BUCKET } from '../types';
import {
  addCheckin, addDays, addSession, calmTrend, dayNumber, emptyProgress, isEmptyResult, lastLever, masteryShare,
  parseProgress, replaceSession, skillTrend, streak, weekOneAndFour, type Progress, type SessionRecord,
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

describe('an empty session is not a session', () => {
  const EMPTY = round({});
  /** What an older build saved for "Start, then End round at once": zero counts over half the planned time. */
  const oldEmptyRecord = (date: string): SessionRecord => ({ date, seconds: 150, counts: { ...EMPTY.counts }, met: false, mode: 'practice' });

  it('tells an empty result from one with any coded sentence', () => {
    expect(isEmptyResult(EMPTY)).toBe(true);
    expect(isEmptyResult(oldEmptyRecord('2026-11-14'))).toBe(true);
    for (const code of ['specific_praise', 'reflection', 'description', 'general_praise', 'neutral', 'question', 'command', 'criticism'] as Code[]) {
      expect(isEmptyResult(round({ [code]: 1 })), code).toBe(false);
    }
  });

  it('is not recorded and does not start the plan', () => {
    const empty = emptyProgress();
    expect(addSession(empty, EMPTY, '2026-11-14', 'practice')).toBe(empty);
    const one = addSession(empty, EARLY, '2026-11-14', 'practice');
    expect(addSession(one, EMPTY, '2026-11-15', 'live')).toBe(one);
  });

  it('is no day of the streak, even when an older build saved it', () => {
    const onlyEmpty: Progress = { ...emptyProgress(), startDate: '2026-11-14', sessions: [oldEmptyRecord('2026-11-14')] };
    expect(streak(parseProgress(onlyEmpty), '2026-11-14')).toEqual({ days: 0, freeDayUsed: false, activeToday: false });
    const p = played(['2026-11-12', '2026-11-13']);
    const withEmptyToday: Progress = { ...p, sessions: [...p.sessions, oldEmptyRecord('2026-11-14')] };
    expect(streak(parseProgress(withEmptyToday), '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: false });
  });

  it('is never praised for staying within the clinic pace', () => {
    const onlyEmpty: Progress = { ...emptyProgress(), startDate: '2026-11-14', sessions: [oldEmptyRecord('2026-11-14')] };
    expect(masteryShare(onlyEmpty)).toEqual({ specific_praise: 0, reflection: 0, description: 0, avoidOk: false, overall: 0 });
    expect(skillTrend(onlyEmpty)).toEqual([]);
  });

  it('does not hide the last real session from the mastery reading', () => {
    const real = addSession(emptyProgress(), NORM, '2026-11-14', 'practice');
    const p: Progress = { ...real, sessions: [...real.sessions, oldEmptyRecord('2026-11-15')] };
    expect(masteryShare(p)).toEqual({ specific_praise: 1, reflection: 1, description: 1, avoidOk: true, overall: 1 });
    expect(skillTrend(p).map((d) => d.date)).toEqual(['2026-11-14']);
  });
});

describe('last session, biggest lever', () => {
  it('is null before any counted session and after a session that met the pace', () => {
    expect(lastLever(emptyProgress())).toBeNull();
    expect(lastLever(addSession(emptyProgress(), NORM, '2026-11-14', 'practice'))).toBeNull();
  });

  it('is the lever the latest session ended with, the same one its result screen showed', () => {
    const p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    expect(EARLY.lever).toBe('question');
    expect(lastLever(p)).toEqual({
      date: '2026-11-14',
      lever: 'question',
      name: 'turning questions into statements',
      text: EARLY.leverText,
      line: 'Last session your biggest lever was turning questions into statements.',
    });
  });

  it('follows the latest day, and the last session of that day', () => {
    const fewPraises = round({ specific_praise: 2, reflection: 10, description: 10 });
    const fewReflections = round({ specific_praise: 10, reflection: 1, description: 10 });
    let p = addSession(emptyProgress(), fewReflections, '2026-11-15', 'practice');
    p = addSession(p, EARLY, '2026-11-14', 'practice');
    expect(lastLever(p)?.lever).toBe('reflection');
    p = addSession(p, fewPraises, '2026-11-15', 'practice');
    expect(lastLever(p)).toMatchObject({ date: '2026-11-15', lever: 'specific_praise' });
    expect(lastLever(addSession(p, NORM, '2026-11-16', 'practice'))).toBeNull();
  });

  it('never names reflections after live play, which does not count them', () => {
    const live = { ...round({ specific_praise: 10, description: 4 }), lever: 'description' as const };
    expect(lastLever(addSession(emptyProgress(), live, '2026-11-14', 'live'))?.lever).toBe('description');
  });

  it('works out the lever for a record saved before the lever was stored', () => {
    const old = (r: ReturnType<typeof round>, mode: 'practice' | 'live'): Progress => ({
      ...emptyProgress(),
      startDate: '2026-11-14',
      sessions: [{ date: '2026-11-14', seconds: r.seconds, counts: { ...r.counts }, met: r.met, mode }],
    });
    expect(lastLever(parseProgress(JSON.stringify(old(EARLY, 'practice'))))?.lever).toBe('question');
    expect(lastLever(old(round({ specific_praise: 10, reflection: 1, description: 10 }), 'practice'))?.lever).toBe('reflection');
    // Live: reflections were not counted, so the widest gap is looked for in the other two skills.
    expect(lastLever(old(round({ specific_praise: 10, description: 4 }), 'live'))?.lever).toBe('description');
    expect(lastLever(old(NORM, 'practice'))).toBeNull();
  });

  it('passes over an empty record', () => {
    const p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    const withEmpty: Progress = { ...p, sessions: [...p.sessions, { ...p.sessions[0], date: '2026-11-15', counts: { ...round({}).counts } }] };
    expect(lastLever(withEmpty)?.date).toBe('2026-11-14');
  });

  it('never scolds', () => {
    for (const n of [{ question: 9 }, { command: 9 }, { criticism: 9 }, { description: 1 }, { reflection: 1, description: 10 }, { reflection: 10, description: 10 }]) {
      const note = lastLever(addSession(emptyProgress(), round(n), '2026-11-14', 'practice'));
      expect(note).not.toBeNull();
      expect(`${note?.line} ${note?.text}`).not.toMatch(/\b(wrong|bad|mistake|should|don't|dont)\b/i);
    }
  });
});

describe('trend and mastery', () => {
  it('uses the best session of each day, on the five-minute scale of the clinic norm', () => {
    let p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    p = addSession(p, NORM, '2026-11-14', 'practice');
    p = addSession(p, round({ description: 3, question: 1 }, 60), '2026-11-15', 'live');
    expect(skillTrend(p)).toEqual([
      { date: '2026-11-14', specific_praise: 10, reflection: 10, description: 10, avoid: 2 },
      // Live play does not measure reflections: the day has no reading, not a zero.
      // A one-minute session is not scaled up for the skills (3 stays 3); the question is (1 a minute is 5 in five).
      { date: '2026-11-15', specific_praise: 0, reflection: null, description: 3, avoid: 5 },
    ]);
  });

  it('measures the latest day against the clinic norm', () => {
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
      expect(skillTrend(p)).toEqual([{ date: '2026-11-14', specific_praise: 10, reflection: null, description: 10, avoid: 0 }]);
    }
  });

  it('lets practice stand when it matches the live session on the skills both measure', () => {
    const live = round({ specific_praise: 5, description: 5 });
    const practice = round({ specific_praise: 5, reflection: 6, description: 5 });
    for (const order of [['live', 'practice'], ['practice', 'live']] as const) {
      let p = emptyProgress();
      for (const mode of order) p = addSession(p, mode === 'live' ? live : practice, '2026-11-14', mode);
      expect(skillTrend(p)[0]).toMatchObject({ specific_praise: 5, reflection: 6, description: 5 });
    }
    // Two live sessions on one day: the stronger one stands.
    let twoLive = addSession(emptyProgress(), round({ description: 3 }), '2026-11-14', 'live');
    twoLive = addSession(twoLive, round({ specific_praise: 10, description: 10 }), '2026-11-14', 'live');
    expect(skillTrend(twoLive)[0]).toMatchObject({ specific_praise: 10, reflection: null, description: 10 });
  });

  it('reads a short round as it is: one sentence in twenty seconds is not a pace', () => {
    const burst = round({ specific_praise: 1, description: 1 }, 20);
    const p = addSession(emptyProgress(), burst, '2026-11-14', 'practice');
    expect(skillTrend(p)).toEqual([{ date: '2026-11-14', specific_praise: 1, reflection: 0, description: 1, avoid: 0 }]);
    expect(masteryShare(p)).toMatchObject({ specific_praise: 0.1, reflection: 0, description: 0.1 });
    // A full five-minute session of the same day stands for it, not the short burst with the higher pace.
    const full = round({ specific_praise: 6, reflection: 5, description: 7 });
    expect(masteryShare(addSession(p, full, '2026-11-14', 'practice'))).toMatchObject({ specific_praise: 0.6, reflection: 0.5, description: 0.7 });
  });

  it('still holds a short round to the limit for questions, commands and corrections', () => {
    const p = addSession(emptyProgress(), round({ description: 2, question: 2 }, 60), '2026-11-14', 'practice');
    // Two in one minute is ten in five, well over the limit of three.
    expect(skillTrend(p)[0].avoid).toBe(10);
    expect(masteryShare(p).avoidOk).toBe(false);
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

  it('keeps the lever of a session, and still reads data saved before the lever was stored', () => {
    const withLever = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    expect(withLever.sessions[0].lever).toBe('question');
    expect(parseProgress(JSON.stringify(withLever)).sessions[0].lever).toBe('question');
    expect(saved.sessions[0].lever).toBeNull();
    expect(parseProgress(JSON.stringify(saved)).sessions[0].lever).toBeNull();

    const old = { ...saved, sessions: saved.sessions.map((s) => ({ date: s.date, seconds: s.seconds, counts: s.counts, met: s.met, mode: s.mode })) };
    const parsed = parseProgress(JSON.stringify(old));
    expect(parsed.sessions).toHaveLength(1);
    expect('lever' in parsed.sessions[0]).toBe(false);
    expect(parsed).toEqual(old);
    expect(parseProgress({ ...saved, sessions: [{ ...saved.sessions[0], lever: 'everything' }] })).toEqual(emptyProgress());
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

describe('replaceSession: a result changed after it was saved', () => {
  const DAY = '2026-11-20';
  const first = round({ description: 4, question: 3 });
  const edited = round({ description: 4, question: 2 });

  it('records the result when nothing was saved for it before', () => {
    expect(replaceSession(emptyProgress(), null, first, DAY, 'practice')).toEqual(addSession(emptyProgress(), first, DAY, 'practice'));
  });

  it('replaces the record it wrote, and only that one', () => {
    const other = addSession(played(['2026-11-14']), NORM, DAY, 'live');
    const saved = replaceSession(other, null, first, DAY, 'practice');
    const after = replaceSession(saved, first, edited, DAY, 'practice');
    expect(after.sessions).toHaveLength(saved.sessions.length);
    expect(after.sessions.slice(0, 2)).toEqual(other.sessions);
    expect(after.sessions.at(-1)?.counts.question).toBe(2);
    expect(after.startDate).toBe('2026-11-14');
  });

  it('takes the record out when every sentence was set aside, and puts it back when one counts again', () => {
    const saved = replaceSession(emptyProgress(), null, first, DAY, 'practice');
    const emptied = replaceSession(saved, first, round({}), DAY, 'practice');
    expect(emptied.sessions).toHaveLength(0);
    expect(streak(emptied, DAY).activeToday).toBe(false);
    const back = replaceSession(emptied, round({}), edited, DAY, 'practice');
    expect(back.sessions).toHaveLength(1);
    expect(back.sessions[0].counts.question).toBe(2);
  });

  it('a first session emptied by "Disagree?" does not start the plan; counting it again does', () => {
    const saved = replaceSession(emptyProgress(), null, first, DAY, 'practice');
    expect(saved.startDate).toBe(DAY);
    const emptied = replaceSession(saved, first, round({}), DAY, 'practice');
    expect(emptied.startDate).toBeNull();
    expect(dayNumber(emptied, addDays(DAY, 5))).toBe(1);
    const back = replaceSession(emptied, round({}), edited, DAY, 'practice');
    expect(back.startDate).toBe(DAY);
    expect(dayNumber(back, addDays(DAY, 5))).toBe(6);
    // With an earlier session still there, the plan keeps its first day.
    const later = replaceSession(played(['2026-11-14']), null, first, DAY, 'practice');
    expect(replaceSession(later, first, round({}), DAY, 'practice').startDate).toBe('2026-11-14');
  });

  it('touches nothing when the earlier record is no longer there', () => {
    const elsewhere = played(['2026-11-14']);
    expect(replaceSession(elsewhere, first, edited, DAY, 'practice')).toBe(elsewhere);
  });

  it('with two equal records on one day replaces one of them', () => {
    const twice = addSession(addSession(emptyProgress(), first, DAY, 'practice'), first, DAY, 'practice');
    const after = replaceSession(twice, first, edited, DAY, 'practice');
    expect(after.sessions.map((s) => s.counts.question).sort()).toEqual([2, 3]);
  });
});

describe('weekOneAndFour', () => {
  const START = '2026-11-01';
  const weak = round({ description: 2, question: 6 });
  const strong = round({ specific_praise: 8, reflection: 6, description: 10, question: 1 });
  const on = (p: Progress, offset: number, r = weak, mode: 'practice' | 'live' = 'practice') => addSession(p, r, addDays(START, offset), mode);

  it('is null until both weeks have a full session with Mia', () => {
    expect(weekOneAndFour(emptyProgress(), 150)).toBeNull();
    expect(weekOneAndFour(on(on(emptyProgress(), 0), 3), 150)).toBeNull();
    // Live play in week 4 is not a session with Mia.
    expect(weekOneAndFour(on(on(emptyProgress(), 0), 24, strong, 'live'), 150)).toBeNull();
  });

  it('averages the days of each week on the five-minute scale', () => {
    let p = on(on(emptyProgress(), 0), 2, round({ description: 4, question: 3 }));
    p = on(on(p, 21, strong), 27, round({ specific_praise: 10, reflection: 10, description: 10 }));
    expect(weekOneAndFour(p, 150)).toEqual({
      first: { days: 2, specific_praise: 0, reflection: 0, description: 3, avoid: 4.5 },
      fourth: { days: 2, specific_praise: 9, reflection: 8, description: 10, avoid: 0.5 },
    });
  });

  it('leaves the short rounds of the first visit out, so they do not stand for week 1', () => {
    // Day 1: the two short first-visit rounds only. Day 2: the first daily session.
    let p = addSession(emptyProgress(), round({ description: 1 }, 60), START, 'practice');
    p = addSession(p, round({ description: 2 }, 40), START, 'practice');
    p = on(on(p, 1, round({ description: 6 })), 22, strong);
    const weeks = weekOneAndFour(p, 150);
    expect(weeks?.first).toEqual({ days: 1, specific_praise: 0, reflection: 0, description: 6, avoid: 0 });
    expect(weeks?.fourth.days).toBe(1);
  });

  it('ignores days outside weeks 1 and 4', () => {
    const p = on(on(on(on(emptyProgress(), 0), 10, strong), 21, strong), 30, weak);
    const weeks = weekOneAndFour(p, 150);
    expect(weeks?.first.days).toBe(1);
    expect(weeks?.fourth.days).toBe(1);
    expect(weeks?.fourth.description).toBe(10);
  });
});
