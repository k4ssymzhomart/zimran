import { describe, expect, it } from 'vitest';
import type { CodedSentence, Code } from '../types';
import { BUCKET } from '../types';
import {
  addCheckin, addDays, addSession, calmTrend, dayNumber, dayStatus, emptyProgress, EXPORT_FORMAT, exportProgress, importProgress,
  isEmptyResult, lastLever, masteryShare, MIN_DAY_SENTENCES, parseFirstRounds, parseProgress, planStreak, readProgress, replaceSession,
  skillTrend, streak, todayFocus, weekOneAndFour, type Progress, type SessionRecord,
} from './history';
import { planDay } from './plan';
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
/** EARLY as it sits in storage. */
const EARLY_RECORD: SessionRecord = { date: '2026-11-14', seconds: 300, counts: { ...EARLY.counts }, met: false, mode: 'practice', lever: 'question' };

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

  // Changed by design: the plan used to count calendar days from the first session (Dec 11 was "day 28").
  it('numbers days by completed days, not by the calendar', () => {
    expect(dayNumber(emptyProgress(), '2026-11-14')).toBe(1);
    const p = played(['2026-11-14']);
    expect(dayNumber(p, '2026-11-14')).toBe(1);
    expect(dayNumber(p, '2026-11-15')).toBe(2);
    expect(dayNumber(p, '2026-12-11')).toBe(2);
    expect(dayNumber(p, '2026-11-01')).toBe(1);
  });
});

describe('the plan moves by completed days', () => {
  const few = round({ description: 2, neutral: 2 });
  const enough = round({ description: 2, neutral: 2, question: 1 });

  it('one session on Nov 1 does not make Nov 10 day 10', () => {
    const p = played(['2026-11-01']);
    expect(dayStatus(p, '2026-11-01')).toEqual({ day: 1, doneToday: true, completedDays: 1 });
    expect(dayStatus(p, '2026-11-10')).toEqual({ day: 2, doneToday: false, completedDays: 1 });
  });

  it('a parent who pays a week after the free visit starts on day 2, not in week 2', () => {
    // The free visit: two short rounds on one evening. Then nothing for a week.
    let p = addSession(emptyProgress(), round({ question: 3, neutral: 1 }, 60), '2026-11-01', 'practice');
    p = addSession(p, round({ description: 2, question: 1 }, 40), '2026-11-01', 'practice');
    expect(dayStatus(p, '2026-11-08')).toEqual({ day: 2, doneToday: false, completedDays: 1 });
    expect(planDay(dayNumber(p, '2026-11-08')).week).toBe(1);
  });

  it(`a date is a completed day from ${MIN_DAY_SENTENCES} coded sentences, of any code`, () => {
    expect(MIN_DAY_SENTENCES).toBe(5);
    expect(dayStatus(addSession(emptyProgress(), few, '2026-11-14', 'practice'), '2026-11-14')).toEqual({ day: 1, doneToday: false, completedDays: 0 });
    expect(dayStatus(addSession(emptyProgress(), enough, '2026-11-14', 'practice'), '2026-11-14')).toEqual({ day: 1, doneToday: true, completedDays: 1 });
    // General praise and neutral talk are coded sentences too.
    const chat = round({ general_praise: 3, neutral: 2 });
    expect(dayStatus(addSession(emptyProgress(), chat, '2026-11-14', 'live'), '2026-11-15').day).toBe(2);
  });

  it('adds up the sessions of one date, and leaves the short ones out', () => {
    const twoSmall = addSession(addSession(emptyProgress(), few, '2026-11-14', 'practice'), few, '2026-11-14', 'live');
    expect(dayStatus(twoSmall, '2026-11-14').doneToday).toBe(true);
    // A round ended before half its length completes nothing, however much was said in it.
    const short = { ...EARLY, short: true };
    const onlyShort = addSession(emptyProgress(), short, '2026-11-14', 'practice');
    expect(onlyShort.sessions[0].short).toBe(true);
    expect(dayStatus(onlyShort, '2026-11-15')).toEqual({ day: 1, doneToday: false, completedDays: 0 });
    expect(dayStatus(addSession(onlyShort, few, '2026-11-14', 'practice'), '2026-11-14').doneToday).toBe(false);
    expect(dayStatus(addSession(onlyShort, enough, '2026-11-14', 'practice'), '2026-11-14').doneToday).toBe(true);
  });

  it('gives one plan day per calendar date at most', () => {
    let p = emptyProgress();
    for (let i = 0; i < 4; i++) p = addSession(p, NORM, '2026-11-14', 'practice');
    expect(dayStatus(p, '2026-11-14')).toEqual({ day: 1, doneToday: true, completedDays: 1 });
    expect(dayNumber(p, '2026-11-15')).toBe(2);
  });

  it('stays on today\'s day after today\'s session and moves on tomorrow', () => {
    const p = played(['2026-11-10', '2026-11-12', '2026-11-13']);
    expect(dayStatus(p, '2026-11-13')).toEqual({ day: 3, doneToday: true, completedDays: 3 });
    expect(dayStatus(p, '2026-11-14')).toEqual({ day: 4, doneToday: false, completedDays: 3 });
    expect(dayStatus(p, '2026-11-30')).toEqual({ day: 4, doneToday: false, completedDays: 3 });
  });

  it('copies short and disputed from the result, and leaves them out when there is nothing to say', () => {
    const plain = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice').sessions[0];
    expect('short' in plain).toBe(false);
    expect('disputed' in plain).toBe(false);
    const marked = addSession(emptyProgress(), { ...EARLY, short: true, disputed: 2 }, '2026-11-14', 'practice').sessions[0];
    expect(marked).toMatchObject({ short: true, disputed: 2 });
    expect(addSession(emptyProgress(), { ...EARLY, short: false, disputed: 0 }, '2026-11-14', 'practice').sessions[0]).toEqual(plain);
  });

  it('a clock set forward and back does not freeze the plan', () => {
    // Day 1 on Nov 14. Then the clock jumps to 2027 for one session, and comes back.
    let p = played(['2026-11-14']);
    p = addSession(p, NORM, '2027-01-01', 'practice');
    expect(dayStatus(p, '2027-01-01')).toEqual({ day: 2, doneToday: true, completedDays: 2 });
    // Back in November: the session from "the future" is not there yet, for the plan and for the streak.
    expect(dayStatus(p, '2026-11-15')).toEqual({ day: 2, doneToday: false, completedDays: 1 });
    expect(streak(p, '2026-11-15')).toEqual({ days: 1, freeDayUsed: false, activeToday: false });
    expect(lastLever(p, '2026-11-15')?.date).toBe('2026-11-14');
    expect(skillTrend(p, '2026-11-15').map((d) => d.date)).toEqual(['2026-11-14']);
    expect(masteryShare(p, '2026-11-15').overall).toBeLessThan(1);
    // The family keeps playing and the days keep moving.
    p = addSession(p, EARLY, '2026-11-15', 'practice');
    expect(dayStatus(p, '2026-11-15')).toEqual({ day: 2, doneToday: true, completedDays: 2 });
    p = addSession(p, EARLY, '2026-11-16', 'practice');
    expect(dayStatus(p, '2026-11-17')).toEqual({ day: 4, doneToday: false, completedDays: 3 });
    expect(streak(p, '2026-11-16')).toEqual({ days: 3, freeDayUsed: false, activeToday: true });
    // A first session saved under a clock set forward does not pin day 1 to the future either.
    let ahead = addSession(emptyProgress(), EARLY, '2027-01-01', 'practice');
    expect(ahead.startDate).toBe('2027-01-01');
    ahead = addSession(ahead, EARLY, '2026-11-14', 'practice');
    expect(dayNumber(ahead, '2026-11-15')).toBe(2);
    // When the calendar reaches that date, it is one more completed day like any other.
    expect(dayNumber(p, '2027-01-02')).toBe(5);
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

  it('counts completed days only: a short round or a few words keep no streak', () => {
    const p = played(['2026-11-12', '2026-11-13']);
    const fewWords = addSession(p, round({ description: 2, question: 2 }), '2026-11-14', 'practice');
    expect(planStreak(fewWords, '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: false });
    const endedEarly = addSession(p, { ...EARLY, short: true }, '2026-11-14', 'practice');
    expect(planStreak(endedEarly, '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: false });
    // The plain streak still counts every record it is given: the saved-session selectors rely on that.
    expect(streak(fewWords, '2026-11-14')).toEqual({ days: 3, freeDayUsed: false, activeToday: true });
    // Such a day is a missed day once it is over: the free day covers it, a second one does not.
    expect(planStreak(addSession(fewWords, EARLY, '2026-11-15', 'practice'), '2026-11-15')).toEqual({ days: 3, freeDayUsed: true, activeToday: true });
  });

  it('is no day of the streak, even when an older build saved it', () => {
    const onlyEmpty: Progress = { ...emptyProgress(), startDate: '2026-11-14', sessions: [oldEmptyRecord('2026-11-14')] };
    expect(planStreak(onlyEmpty, '2026-11-14')).toEqual({ days: 0, freeDayUsed: false, activeToday: false });
    const p = played(['2026-11-12', '2026-11-13']);
    const withEmptyToday: Progress = { ...p, sessions: [...p.sessions, oldEmptyRecord('2026-11-14')] };
    expect(planStreak(withEmptyToday, '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: false });
    // Read from storage, the empty record is gone, so the plain streak does not see it either.
    expect(parseProgress(withEmptyToday).sessions).toHaveLength(2);
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
  });

  // Changed by design: one round that met the pace used to make the personal line vanish.
  it('looks back through the last five counted sessions for the latest lever', () => {
    let p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    p = addSession(p, NORM, '2026-11-15', 'practice');
    expect(lastLever(p)).toEqual({
      date: '2026-11-14',
      lever: 'question',
      name: 'turning questions into statements',
      text: EARLY.leverText,
      line: 'Your biggest lever lately has been turning questions into statements.',
    });
    // Four clean sessions after it: still inside the last five.
    for (const date of ['2026-11-16', '2026-11-17', '2026-11-18']) p = addSession(p, NORM, date, 'practice');
    expect(lastLever(p)?.lever).toBe('question');
    // A fifth: the lever is now six sessions back, and five clean rounds need no reminder.
    p = addSession(p, NORM, '2026-11-19', 'practice');
    expect(lastLever(p)).toBeNull();
    // A newer lever takes the line back, in the words of "last session".
    const fewReflections = round({ specific_praise: 10, reflection: 1, description: 10 });
    expect(lastLever(addSession(p, fewReflections, '2026-11-20', 'practice'))?.line).toBe('Last session your biggest lever was saying her words back.');
  });

  it('takes no lever from a round that was ended early', () => {
    const p = addSession(emptyProgress(), EARLY, '2026-11-14', 'practice');
    const short = { ...round({ command: 4 }), short: true };
    expect(short.lever).toBe('command');
    expect(lastLever(addSession(p, short, '2026-11-15', 'practice'))).toMatchObject({ date: '2026-11-14', lever: 'question' });
    expect(lastLever(addSession(emptyProgress(), short, '2026-11-15', 'practice'))).toBeNull();
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

  it('keeps check-ins made before the first session: weeks start at the earlier of the two', () => {
    // Three evenings of check-ins on the dashboard, then the first session.
    let p = addCheckin(addCheckin(emptyProgress(), '2026-11-10', 3), '2026-11-12', 2);
    expect(calmTrend(p)).toEqual([{ week: 1, average: 2.5 }]);
    p = addSession(p, EARLY, '2026-11-14', 'practice');
    p = addCheckin(p, '2026-11-18', 1);
    expect(calmTrend(p)).toEqual([
      { week: 1, average: 2.5 },
      { week: 2, average: 1 },
    ]);
    // The other way round, weeks still start at the first session.
    const later = addCheckin(played(['2026-11-14']), '2026-11-22', 0);
    expect(calmTrend(later)).toEqual([{ week: 1, average: null }, { week: 2, average: 0 }]);
  });
});

describe('parseProgress', () => {
  const saved = addCheckin(addSession(emptyProgress(), NORM, '2026-11-14', 'live'), '2026-11-14', 2);

  it('round-trips through JSON, as an object or a string', () => {
    expect(parseProgress(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
    expect(parseProgress(JSON.stringify(saved))).toEqual(saved);
    const marked = addSession(saved, { ...EARLY, short: true, disputed: 3 }, '2026-11-15', 'practice');
    expect(parseProgress(JSON.stringify(marked))).toEqual(marked);
    expect(parseProgress(JSON.stringify(marked)).sessions[1]).toMatchObject({ short: true, disputed: 3 });
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
  });

  // Changed by design: an unknown lever used to empty the whole Progress. Now the session stays and only
  // the field goes; lastLever works the lever out from the counts, as it does for records without one.
  it('drops an optional field that does not read, and keeps the session', () => {
    const odd = { ...EARLY_RECORD, lever: 'everything', short: 'yes', disputed: -1 };
    const { progress, dropped } = readProgress({ ...saved, sessions: [odd] });
    expect(dropped).toBe(0);
    expect(progress.sessions).toEqual([{ date: EARLY_RECORD.date, seconds: 300, counts: EARLY.counts, met: false, mode: 'practice' }]);
    expect(lastLever(progress)?.lever).toBe('question');
  });

  it('starts fresh only when there is nothing to read', () => {
    for (const nothing of [null, undefined, 42, 'not json', '', [], {}, '[]', '"text"', 'null']) {
      expect(readProgress(nothing)).toEqual({ progress: emptyProgress(), dropped: 0 });
      expect(parseProgress(nothing)).toEqual(emptyProgress());
    }
  });

  // Changed by design: each of these used to return an empty Progress, and the next save erased the history.
  describe('a damaged record costs only itself', () => {
    const real = [EARLY_RECORD, { ...EARLY_RECORD, date: '2026-11-15' }, { ...EARLY_RECORD, date: '2026-11-16' }];
    const family = { v: 1, startDate: '2026-11-14', anchor: 'After dinner', sessions: real, checkins: [{ date: '2026-11-14', tantrums: 2 }] };
    /** The family's saved object with one key missing. */
    const without = (key: keyof typeof family): Record<string, unknown> =>
      Object.fromEntries(Object.entries(family).filter(([k]) => k !== key));

    it('mode "daily": that session goes, the others and the check-ins stay', () => {
      const { progress, dropped } = readProgress({ ...family, sessions: [real[0], { ...real[1], mode: 'daily' }, real[2]] });
      expect(dropped).toBe(1);
      expect(progress.sessions.map((s) => s.date)).toEqual(['2026-11-14', '2026-11-16']);
      expect(progress.checkins).toEqual(family.checkins);
      expect(progress.anchor).toBe('After dinner');
      expect(dayNumber(progress, '2026-11-17')).toBe(3);
    });

    it('missing anchor: the anchor is unset and nothing else is lost', () => {
      expect(readProgress(without('anchor'))).toEqual({ progress: { ...family, anchor: null }, dropped: 0 });
      expect(parseProgress({ ...family, anchor: 7 })).toEqual({ ...family, anchor: null });
    });

    it('missing checkins: the sessions stay', () => {
      expect(readProgress(without('checkins'))).toEqual({ progress: { ...family, checkins: [] }, dropped: 0 });
      expect(parseProgress({ ...family, checkins: 'none' }).sessions).toHaveLength(3);
      expect(parseProgress({ ...family, sessions: null }).checkins).toEqual(family.checkins);
    });

    it('v: 2: the records that read are kept, as version 1', () => {
      expect(readProgress({ ...family, v: 2 })).toEqual({ progress: family, dropped: 0 });
      expect(parseProgress(JSON.stringify({ ...family, v: 'two' }))).toEqual(family);
    });

    it('a session dated 2027-01-01 among real ones is kept, and does not move or freeze the plan', () => {
      const { progress, dropped } = readProgress({ ...family, sessions: [...real, { ...EARLY_RECORD, date: '2027-01-01' }] });
      expect(dropped).toBe(0);
      expect(progress.sessions).toHaveLength(4);
      expect(dayStatus(progress, '2026-11-17')).toEqual({ day: 4, doneToday: false, completedDays: 3 });
      expect(streak(progress, '2026-11-17').days).toBe(3);
    });

    it('a start date that is not a date is read from the first session', () => {
      for (const startDate of ['14.11.2026', '2026-02-31', null, 5]) {
        expect(parseProgress({ ...family, startDate }).startDate).toBe('2026-11-14');
      }
      expect(parseProgress({ ...without('startDate'), sessions: [real[2], real[0]] }).startDate).toBe('2026-11-14');
      expect(parseProgress({ ...family, startDate: null, sessions: [] }).startDate).toBeNull();
    });

    it('counts every record it could not read', () => {
      const { progress, dropped } = readProgress({
        ...family,
        sessions: [real[0], { ...real[1], counts: { target: 1 } }, null, 'x', { ...real[2], date: '2026-02-31' }, { ...real[2], seconds: -5 }, { ...real[2], met: 'yes' }, real[2]],
        checkins: [{ date: '2026-11-14', tantrums: 7 }, { date: 'soon', tantrums: 1 }, { date: '2026-11-15', tantrums: 0 }],
      });
      expect(dropped).toBe(8);
      expect(progress.sessions.map((s) => s.date)).toEqual(['2026-11-14', '2026-11-16']);
      expect(progress.checkins).toEqual([{ date: '2026-11-15', tantrums: 0 }]);
    });

    it('what it returns can be saved and read again unchanged', () => {
      const once = parseProgress({ ...family, v: 2, sessions: [...real, { ...real[0], mode: 'daily' }, { ...real[0], extra: 1, counts: { ...EARLY.counts, extra: 9 } }] });
      expect(readProgress(JSON.stringify(once))).toEqual({ progress: once, dropped: 0 });
      expect(Object.keys(once.sessions[3])).toEqual(['date', 'seconds', 'counts', 'met', 'mode', 'lever']);
      expect(Object.keys(once.sessions[3].counts)).toHaveLength(10);
    });
  });
});

describe('parseFirstRounds', () => {
  const rounds = { before: EARLY, after: NORM };

  it('reads what saveFirstRounds wrote, as an object or a string', () => {
    expect(parseFirstRounds(rounds)).toEqual(rounds);
    expect(parseFirstRounds(JSON.stringify(rounds))).toEqual(rounds);
    const marked = { before: { ...EARLY, short: true, disputed: 1 }, after: NORM };
    expect(parseFirstRounds(JSON.stringify(marked))).toEqual(marked);
  });

  it('is null for anything the dashboard could not show', () => {
    const broken: unknown[] = [
      null, undefined, '', 'not json', '{}', {}, [], 42,
      { before: EARLY }, { after: NORM }, { before: {}, after: {} }, { before: EARLY, after: null },
      { before: EARLY, after: { ...NORM, counts: undefined } },
      { before: EARLY, after: { ...NORM, counts: { ...NORM.counts, avoid: 'two' } } },
      { before: { ...EARLY, targets: { specific_praise: 10 } }, after: NORM },
      { before: { ...EARLY, seconds: null }, after: NORM },
      { before: { ...EARLY, met: 1 }, after: NORM },
    ];
    for (const b of broken) expect(parseFirstRounds(b), JSON.stringify(b)).toBeNull();
  });

  it('returns only the fields of a result, with the lever text of today', () => {
    const odd = { before: { ...EARLY, lever: 'everything', leverText: '<b>hi</b>', extra: 1 }, after: { ...NORM, leverText: 'old words' } };
    const read = parseFirstRounds(odd);
    expect(read?.before).toEqual({ ...EARLY, lever: null, leverText: null });
    expect(read?.after).toEqual(NORM);
    expect(parseFirstRounds({ before: { ...EARLY, leverText: 'old words' }, after: NORM })?.before.leverText).toBe(EARLY.leverText);
  });
});

describe('export and import', () => {
  let family = played(['2026-11-14', '2026-11-15']);
  family = addCheckin({ ...family, anchor: 'After dinner' }, '2026-11-15', 1);

  it('writes pretty JSON with a format name, a version and the date', () => {
    const text = exportProgress(family, '2026-11-16');
    expect(text).toContain('\n  "format": "playreps-progress",\n  "version": 1,\n  "exportedOn": "2026-11-16",\n');
    expect(JSON.parse(text)).toEqual({ format: EXPORT_FORMAT, version: 1, exportedOn: '2026-11-16', progress: family });
    expect(exportProgress(family, '2026-11-16')).toBe(text);
  });

  it('reads its own file back to the same Progress', () => {
    expect(importProgress(exportProgress(family, '2026-11-16'))).toEqual(family);
    expect(importProgress(exportProgress(emptyProgress(), '2026-11-16'))).toEqual(emptyProgress());
  });

  it('is null for a file that is not an export, so nothing is replaced by nothing', () => {
    const file = JSON.parse(exportProgress(family, '2026-11-16'));
    const others = [
      '', 'not json', '[]', '{}', 'null', JSON.stringify(family),
      JSON.stringify({ ...file, format: 'something-else' }),
      JSON.stringify({ ...file, version: 2 }),
      JSON.stringify({ ...file, progress: null }),
      JSON.stringify({ ...file, progress: { ...family, sessions: 'none' } }),
    ];
    for (const text of others) expect(importProgress(text), text.slice(0, 40)).toBeNull();
  });

  it('keeps the records that read from a file edited by hand', () => {
    const file = JSON.parse(exportProgress(family, '2026-11-16'));
    file.progress.sessions[0].mode = 'daily';
    delete file.progress.anchor;
    const read = importProgress(JSON.stringify(file));
    expect(read?.sessions.map((s) => s.date)).toEqual(['2026-11-15']);
    expect(read?.anchor).toBeNull();
    expect(read?.checkins).toEqual(family.checkins);
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
    // Changed by design: five calendar days later it is day 2 (one completed day), not day 6.
    expect(dayNumber(back, addDays(DAY, 5))).toBe(2);
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

// Changed by design: weeks used to be calendar weeks from the first session. They are plan days now:
// days 1-7 against days 22-28, wherever those fell on the calendar.
describe('weekOneAndFour', () => {
  const START = '2026-11-01';
  const weak = round({ description: 2, question: 6 });
  const strong = round({ specific_praise: 8, reflection: 6, description: 10, question: 1 });
  const on = (p: Progress, offset: number, r = weak, mode: 'practice' | 'live' = 'practice') => addSession(p, r, addDays(START, offset), mode);
  /** One session on each of `n` dates starting at calendar offset `from`, every `step` days. */
  const run = (p: Progress, from: number, n: number, r = weak, step = 1) =>
    Array.from({ length: n }, (_, i) => from + i * step).reduce((acc, offset) => on(acc, offset, r), p);

  it('is null until plan days 1-7 and 22-28 both have a full session with Mia', () => {
    expect(weekOneAndFour(emptyProgress(), 150)).toBeNull();
    expect(weekOneAndFour(run(emptyProgress(), 0, 21), 150)).toBeNull();
    // Calendar week 4 is not plan week 4: two sessions three weeks apart are plan days 1 and 2.
    expect(weekOneAndFour(on(on(emptyProgress(), 0), 24, strong), 150)).toBeNull();
    // Live play on plan day 22 is not a session with Mia.
    expect(weekOneAndFour(on(run(emptyProgress(), 0, 21), 21, strong, 'live'), 150)).toBeNull();
    expect(weekOneAndFour(on(run(emptyProgress(), 0, 21), 21, strong), 150)?.fourth.days).toBe(1);
  });

  it('averages plan days 1-7 and 22-28 on the five-minute scale', () => {
    let p = on(on(emptyProgress(), 0), 1, round({ description: 4, question: 3 }));
    p = run(p, 2, 19, strong);
    p = on(on(p, 21, strong), 22, round({ specific_praise: 10, reflection: 10, description: 10 }));
    const weeks = weekOneAndFour(p, 150);
    expect(weeks?.first.days).toBe(7);
    expect(weeks?.fourth).toEqual({ days: 2, specific_praise: 9, reflection: 8, description: 10, avoid: 0.5 });
    const firstTwo = weekOneAndFour(run(on(on(on(emptyProgress(), 0), 1, round({ description: 4, question: 3 })), 60, strong), 61, 21, strong, 2), 150);
    expect(firstTwo?.first.days).toBe(7);
  });

  it('compares by plan day when the family took its time: every other day for eight weeks', () => {
    // 28 sessions, one every second day: the last seven fall in calendar weeks 7 and 8.
    let p = run(emptyProgress(), 0, 7, weak, 2);
    p = run(p, 14, 14, round({ description: 6, question: 3 }), 2);
    p = run(p, 42, 7, strong, 2);
    expect(dayNumber(p, addDays(START, 56))).toBe(29);
    expect(weekOneAndFour(p, 150)).toEqual({
      first: { days: 7, specific_praise: 0, reflection: 0, description: 2, avoid: 6 },
      fourth: { days: 7, specific_praise: 8, reflection: 6, description: 10, avoid: 1 },
    });
  });

  it('leaves the short rounds of the first visit out, so they do not stand for week 1', () => {
    // Plan day 1: the two short first-visit rounds only. Plan day 2: the first daily session.
    let p = addSession(emptyProgress(), round({ description: 2, question: 2 }, 60), START, 'practice');
    p = addSession(p, round({ description: 2 }, 40), START, 'practice');
    p = on(p, 1, round({ description: 6 }));
    p = on(run(p, 2, 19), 21, strong);
    const weeks = weekOneAndFour(p, 150);
    expect(weeks?.first.days).toBe(6);
    // (6 + 2 + 2 + 2 + 2 + 2) / 6: the one description of the 60-second round is not in it.
    expect(weeks?.first.description).toBe(2.7);
    expect(weeks?.fourth.days).toBe(1);
  });

  it('leaves out a round that was ended early, whatever its measured time', () => {
    const p = on(run(emptyProgress(), 0, 21), 21, strong);
    const withShort = addSession(p, { ...round({ specific_praise: 30, reflection: 30, description: 30 }, 150), short: true }, addDays(START, 21), 'practice');
    expect(weekOneAndFour(withShort, 150)).toEqual(weekOneAndFour(p, 150));
  });

  it('ignores plan days outside 1-7 and 22-28, and days after the plan', () => {
    let p = run(emptyProgress(), 0, 7);
    p = run(p, 7, 14, strong);
    p = run(p, 21, 7, round({ description: 9 }));
    p = run(p, 28, 5, round({ description: 1 }));
    const weeks = weekOneAndFour(p, 150);
    expect(weeks?.first).toEqual({ days: 7, specific_praise: 0, reflection: 0, description: 2, avoid: 6 });
    expect(weeks?.fourth).toEqual({ days: 7, specific_praise: 0, reflection: 0, description: 9, avoid: 0 });
  });

  it('with today, leaves out sessions dated after it', () => {
    const p = on(run(emptyProgress(), 0, 21), 400, strong);
    expect(weekOneAndFour(p, 150)?.fourth.days).toBe(1);
    expect(weekOneAndFour(p, 150, addDays(START, 30))).toBeNull();
  });
});

describe('todayFocus', () => {
  const D = (n: number) => addDays('2026-11-01', n);
  /** One five-minute session a day from day 1 on, with the given results. */
  const sessions = (results: ReturnType<typeof round>[], mode: 'practice' | 'live' = 'practice') =>
    results.reduce((p, r, i) => addSession(p, r, D(i), mode), emptyProgress());
  const asking = round({ description: 4, question: 6, command: 2 });
  const calm = round({ specific_praise: 3, reflection: 3, description: 3, question: 1 });

  it('follows the plan before there are two daily sessions, and names its theme', () => {
    expect(todayFocus(emptyProgress(), D(0))).toEqual({
      lever: 'question', source: 'plan', line: 'Today follows the plan, Follow: turning questions into statements.',
    });
    expect(todayFocus(sessions([asking]), D(1))).toMatchObject({ lever: 'question', source: 'plan' });
    // The two short rounds of the first visit are not daily sessions: they do not speak for the family.
    let visit = addSession(emptyProgress(), round({ command: 5 }, 60), D(0), 'practice');
    visit = addSession(visit, round({ command: 4, description: 1 }, 40), D(0), 'practice');
    expect(todayFocus(visit, D(1))).toMatchObject({ lever: 'question', source: 'plan' });
    // Nor does a round that was ended early.
    const early = addSession(sessions([asking]), { ...asking, short: true }, D(1), 'practice');
    expect(todayFocus(early, D(2)).source).toBe('plan');
  });

  it('(a) over the to-swap pace in two of the last three: the most frequent of the three, with their numbers', () => {
    // Day 9 of the plan says "description"; the family's own numbers say questions.
    const p = sessions([calm, calm, calm, calm, calm, asking, calm, round({ description: 2, question: 7, command: 5 })]);
    expect(planDay(dayNumber(p, D(8))).focus).toBe('description');
    expect(todayFocus(p, D(8))).toEqual({
      lever: 'question',
      source: 'data',
      line: 'Your last three sessions averaged 5 questions, so today starts with turning questions into statements.',
    });
    const commands = sessions([round({ command: 5, question: 1 }), round({ command: 4, criticism: 2 })]);
    expect(todayFocus(commands, D(2))).toEqual({
      // Changed by design: the lever reads "following her lead", which stays grammatical when the screens turn it into "his lead" for Leo.
      lever: 'command', source: 'data', line: 'Your last two sessions averaged 5 commands, so today starts with following her lead.',
    });
    const corrections = sessions([round({ criticism: 4 }), round({ criticism: 5, description: 9 }), calm]);
    expect(todayFocus(corrections, D(3))).toMatchObject({ lever: 'criticism', source: 'data', line: 'Your last three sessions averaged 3 corrections, so today starts with letting small things pass.' });
  });

  it('(a) needs two sessions over the pace; one noisy day changes nothing', () => {
    const p = sessions([calm, calm, calm, calm, calm, calm, calm, asking, round({ description: 9, question: 3 })]);
    expect(todayFocus(p, D(9)).source).toBe('plan');
    // Exactly at the limit of three is within the pace.
    const atLimit = sessions([round({ description: 9, question: 3 }), round({ description: 9, command: 3 })]);
    expect(todayFocus(atLimit, D(2)).lever).not.toBe('command');
  });

  it('(a) on a tie the plan\'s own lever wins, else the first of question, command, correction', () => {
    const tie = [round({ question: 4, command: 4 }), round({ question: 2, command: 2, criticism: 4 })];
    // Day 3: the plan says question. Day 5: the plan says command.
    expect(planDay(3).focus).toBe('question');
    expect(todayFocus(sessions(tie), D(2)).lever).toBe('question');
    const still = round({ specific_praise: 3, reflection: 3, description: 3 });
    const day5 = sessions([still, still, ...tie]);
    expect(planDay(dayNumber(day5, D(4))).focus).toBe('command');
    expect(todayFocus(day5, D(4))).toMatchObject({ lever: 'command', source: 'data' });
    // Day 9, description: no avoid lever is the plan's, so the order decides.
    const day9 = sessions([still, still, still, still, still, still, ...tie]);
    expect(todayFocus(day9, D(8)).lever).toBe('question');
    const commandOrCorrection = [round({ command: 4, criticism: 4 }), round({ command: 4, criticism: 4 })];
    expect(todayFocus(sessions([still, still, still, still, still, still, ...commandOrCorrection]), D(8)).lever).toBe('command');
  });

  it('(a) holds a half-length session to the same pace, and never reports an average of zero', () => {
    const half = (n: Parameters<typeof round>[0]) => round(n, 150);
    // Two to-swap sentences in half of five minutes are four in five: over the pace. The smallest case there is.
    const p = sessions([half({ description: 5, question: 1, command: 1 }), half({ description: 5, question: 1, criticism: 1 }), round({ description: 5, neutral: 1 })]);
    expect(todayFocus(p, D(3))).toEqual({
      lever: 'question',
      source: 'data',
      line: 'Your last three sessions averaged 1 question, so today starts with turning questions into statements.',
    });
  });

  it('(b) one skill under half the pace while the plan\'s skill is at 80%: that skill, with their numbers', () => {
    const noReflections = round({ specific_praise: 6, reflection: 2, description: 9, question: 1 });
    // Day 9: the plan says description (9 of 10), reflections average 2.
    const p = sessions([calm, calm, calm, calm, calm, noReflections, noReflections, noReflections]);
    expect(todayFocus(p, D(8))).toEqual({
      lever: 'reflection',
      source: 'data',
      line: 'Your last three sessions averaged 2 reflections against a clinic pace of 10, so today starts with saying her words back.',
    });
    // The plan's skill itself still short of 80%: the plan keeps the day.
    const stillLearning = round({ specific_praise: 6, reflection: 2, description: 7 });
    expect(todayFocus(sessions([calm, calm, calm, calm, calm, stillLearning, stillLearning, stillLearning]), D(8))).toEqual({
      lever: 'description', source: 'plan', line: 'Today follows the plan, Describe: describing what she does.',
    });
    // No skill under half: the plan keeps the day.
    const even = round({ specific_praise: 5, reflection: 5, description: 9 });
    expect(todayFocus(sessions([calm, calm, calm, calm, calm, even, even, even]), D(8)).source).toBe('plan');
  });

  it('(b) on a day about questions or commands, "at 80%" means they are within the limit', () => {
    const quiet = round({ description: 8, reflection: 6, specific_praise: 1, question: 2 });
    expect(todayFocus(sessions([quiet, quiet]), D(2))).toEqual({
      lever: 'specific_praise',
      source: 'data',
      line: 'Your last two sessions averaged 1 specific praise against a clinic pace of 10, so today starts with naming exactly what you liked.',
    });
    // Over the limit once (not twice, so (a) stays out) and over it on average: the plan's lever is not there yet.
    const noisy = round({ description: 8, reflection: 6, specific_praise: 1, question: 9 });
    expect(todayFocus(sessions([quiet, noisy]), D(2))).toMatchObject({ lever: 'question', source: 'plan' });
  });

  it('(b) on a tie takes description, then reflection, then specific praise; the lowest wins otherwise', () => {
    const quietDay = (n: Parameters<typeof round>[0]) => sessions([round(n), round(n)]);
    expect(todayFocus(quietDay({ description: 2, reflection: 2, specific_praise: 2 }), D(2)).lever).toBe('description');
    expect(todayFocus(quietDay({ description: 6, reflection: 2, specific_praise: 2 }), D(2)).lever).toBe('reflection');
    expect(todayFocus(quietDay({ description: 4, reflection: 3, specific_praise: 1 }), D(2)).lever).toBe('specific_praise');
    expect(todayFocus(quietDay({ description: 4, reflection: 3, specific_praise: 1 }), D(2))).toEqual(todayFocus(quietDay({ description: 4, reflection: 3, specific_praise: 1 }), D(2)));
  });

  it('does not read reflections from live play, which does not count them', () => {
    const live = round({ specific_praise: 8, description: 8 });
    // Two live sessions: reflections were not measured, so they are not a weak spot.
    expect(todayFocus(sessions([live, live], 'live'), D(2)).source).toBe('plan');
    // One practice session among them is the reading for reflections.
    const mixed = addSession(sessions([live, live], 'live'), round({ specific_praise: 8, reflection: 1, description: 8 }), D(2), 'practice');
    expect(todayFocus(mixed, D(3))).toMatchObject({ lever: 'reflection', source: 'data' });
    expect(todayFocus(mixed, D(3)).line).toContain('averaged 1 reflection against');
  });

  it('reads the last three only, and nothing dated after today', () => {
    const old = [asking, asking, asking];
    const now = [round({ specific_praise: 9, reflection: 9, description: 9 }), round({ specific_praise: 9, reflection: 9, description: 9 }), round({ specific_praise: 9, reflection: 9, description: 9 })];
    expect(todayFocus(sessions([...old, ...now]), D(6)).source).toBe('plan');
    const ahead = addSession(addSession(sessions(now), asking, '2027-01-01', 'practice'), asking, '2027-01-02', 'practice');
    expect(todayFocus(ahead, D(3)).source).toBe('plan');
    expect(todayFocus(ahead, '2027-01-03')).toMatchObject({ lever: 'question', source: 'data' });
  });

  // Changed by design: the day is titled "Your own focus" (a title addressed to the parent carries no blame),
  // and after day 28 the plan's line names no weekly theme: there is none, and "Keep:" read as a stray word.
  it('on "Your own focus" day the lowest skill under the pace is the focus, whatever the plan\'s fallback', () => {
    const good = round({ specific_praise: 9, reflection: 7, description: 8, question: 1 });
    const p = sessions(Array.from({ length: 33 }, () => good));
    expect(planDay(dayNumber(p, D(33)))).toMatchObject({ day: 34, title: 'Your own focus', focus: 'specific_praise', weakSpot: true });
    expect(todayFocus(p, D(33))).toEqual({
      lever: 'reflection',
      source: 'data',
      line: 'Your last three sessions averaged 7 reflections against a clinic pace of 10, so today starts with saying her words back.',
    });
    // Every skill at the pace: nothing to point at, the plan's fallback stands.
    const atPace = sessions(Array.from({ length: 33 }, () => NORM));
    expect(todayFocus(atPace, D(33))).toEqual({
      lever: 'specific_praise', source: 'plan', line: 'Today follows the plan: naming exactly what you liked.',
    });
    // On any other day after the plan, 7 of 10 is not a clear weak spot.
    expect(todayFocus(sessions(Array.from({ length: 30 }, () => good)), D(30)).source).toBe('plan');
  });

  it('names all three skills on a skill check, no theme after day 28, and "your child" on a live day', () => {
    const steady = round({ specific_praise: 9, reflection: 9, description: 9 });
    const days = (n: number) => sessions(Array.from({ length: n }, () => steady));
    // Day 28 and day 35 are skill checks: the line is about all three skills, not about one of them.
    expect(planDay(dayNumber(days(27), D(27))).isMasteryCheck).toBe(true);
    expect(todayFocus(days(27), D(27))).toEqual({ lever: 'specific_praise', source: 'plan', line: 'Today is the skill check: all three skills against the clinic pace.' });
    expect(todayFocus(days(34), D(34)).line).toBe('Today is the skill check: all three skills against the clinic pace.');
    // Day 29: no "Keep:" in front of the skill.
    expect(todayFocus(days(28), D(28)).line).toBe('Today follows the plan: following her lead.');
    // Day 30 is live play with the parent's own child, who may be a son.
    expect(planDay(dayNumber(days(29), D(29))).live).toBe(true);
    expect(todayFocus(days(29), D(29)).line).toBe('Today follows the plan: describing what your child does.');
    for (const n of [27, 28, 29, 30, 31, 32, 33, 34]) expect(todayFocus(days(n), D(n)).line, String(n)).not.toMatch(/\bKeep\b|\b(?:she|her)\b.*your child/);
    // Day 6, "Wait quietly", is about following, not about questions.
    expect(planDay(dayNumber(days(5), D(5)))).toMatchObject({ day: 6, title: 'Wait quietly' });
    expect(todayFocus(days(5), D(5)).line).toBe('Today follows the plan, Follow: following her lead.');
  });

  it('never scolds and never shouts', () => {
    const lines = [
      todayFocus(emptyProgress(), D(0)), todayFocus(sessions([asking, asking]), D(2)),
      todayFocus(sessions([round({ criticism: 9 }), round({ criticism: 9 })]), D(2)),
      todayFocus(sessions([round({ description: 9 }), round({ description: 9 })]), D(2)),
    ].map((f) => f.line);
    for (const line of lines) {
      expect(line).not.toMatch(/\b(wrong|bad|mistake|fail\w*|should|don't|dont)\b/i);
      expect(line).not.toContain('!');
      expect(line).toMatch(/^[A-Z].*\.$/);
    }
  });
});
