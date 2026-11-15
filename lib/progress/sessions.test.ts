import { describe, expect, it } from 'vitest';
import type { Code, Counts, SavedSentence, SavedSession } from '../types';
import { addDays, emptyProgress, streak } from './history';
import { PLAN_DAYS } from './plan';
import {
  beforeAfter, bestStreakOf, monthGrid, planDayOf, sessionPatterns, streakOf, totalsOf, weekNumbers,
} from './sessions';

// ---------- fixtures ----------

function counts(n: Partial<Record<Exclude<Code, 'unknown'>, number>> = {}): Counts {
  const c = { specific_praise: 0, reflection: 0, description: 0, general_praise: 0, neutral: 0, question: 0, command: 0, criticism: 0, ...n };
  return { ...c, target: c.specific_praise + c.reflection + c.description, avoid: c.question + c.command + c.criticism };
}

let nextId = 0;
function session(over: Partial<SavedSession> = {}): SavedSession {
  const date = over.date ?? '2026-11-13';
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

const on = (dates: string[]): SavedSession[] => dates.map((date) => session({ date }));
const run = (from: string, n: number): string[] => Array.from({ length: n }, (_, i) => addDays(from, i));
const say = (text: string, code: Code, startSec: number, extra: Partial<SavedSentence> = {}): SavedSentence => ({
  text, code, startSec, atSec: startSec + 2, ...extra,
});

// ---------- streak ----------

describe('streakOf', () => {
  it('is zero with no sessions', () => {
    expect(streakOf([], '2026-11-14')).toEqual({ days: 0, freeDayUsed: false, activeToday: false });
  });

  it('counts consecutive days including today', () => {
    expect(streakOf(on(run('2026-11-10', 5)), '2026-11-14')).toEqual({ days: 5, freeDayUsed: false, activeToday: true });
  });

  it('keeps the streak while today is still open', () => {
    expect(streakOf(on(run('2026-11-10', 4)), '2026-11-14')).toEqual({ days: 4, freeDayUsed: false, activeToday: false });
  });

  it('counts a day once, however many sessions it holds', () => {
    expect(streakOf(on(['2026-11-13', '2026-11-14', '2026-11-14', '2026-11-14']), '2026-11-14').days).toBe(2);
  });

  it('forgives one missed day in seven without counting it', () => {
    const s = on(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14']);
    expect(streakOf(s, '2026-11-14')).toEqual({ days: 4, freeDayUsed: true, activeToday: true });
  });

  it('ends at a second miss within seven days, and at two missed days in a row', () => {
    expect(streakOf(on(['2026-11-08', '2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14']), '2026-11-14').days).toBe(4);
    const twoInARow = on(['2026-11-09', '2026-11-10', '2026-11-13', '2026-11-14']);
    expect(streakOf(twoInARow, '2026-11-14')).toEqual({ days: 2, freeDayUsed: false, activeToday: true });
  });

  it('forgives a second miss once seven days have passed', () => {
    const dates = run('2026-11-01', 14).filter((d) => d !== '2026-11-04' && d !== '2026-11-11');
    expect(streakOf(on(dates), '2026-11-14')).toEqual({ days: 12, freeDayUsed: true, activeToday: true });
  });

  it('follows the rule in history.ts for any mix of days and kinds', () => {
    const dates = ['2026-10-30', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10'];
    const sessions = dates.map((date, i) => session({ date, kind: i % 2 ? 'live' : 'practice' }));
    const old = { ...emptyProgress(), sessions: dates.map((date) => ({ date, seconds: 300, counts: counts(), met: false, mode: 'practice' as const })) };
    for (const today of run('2026-10-30', 16)) expect(streakOf(sessions, today)).toEqual(streak(old, today));
  });
});

describe('bestStreakOf', () => {
  it('is zero with no sessions', () => {
    expect(bestStreakOf([])).toBe(0);
  });

  it('finds the longest run, wherever it sits', () => {
    expect(bestStreakOf(on([...run('2026-10-01', 5), ...run('2026-11-10', 2)]))).toBe(5);
    expect(bestStreakOf(on([...run('2026-10-01', 2), ...run('2026-11-10', 3)]))).toBe(3);
  });

  it('uses the same free day as the streak', () => {
    expect(bestStreakOf(on(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14']))).toBe(4);
  });
});

// ---------- calendar ----------

describe('monthGrid', () => {
  const sessions = [
    session({ date: '2026-11-01' }),
    session({ date: '2026-11-10' }),
    session({ date: '2026-11-10', met: true }),
    session({ date: '2026-12-02', met: true }),
  ];
  const november = monthGrid(sessions, 2026, 10, '2026-11-13');

  it('lays a month out in weeks of seven days, Monday first', () => {
    expect(november).toHaveLength(6);
    expect(november.every((week) => week.length === 7)).toBe(true);
    // 1 November 2026 is a Sunday: the first row starts on Monday 26 October.
    expect(november[0].map((d) => d.date)).toEqual(run('2026-10-26', 7));
    expect(november[5][0].date).toBe('2026-11-30');
    expect(november[5][6].date).toBe('2026-12-06');
  });

  it('marks the days outside the month', () => {
    expect(november[0].map((d) => d.inMonth)).toEqual([false, false, false, false, false, false, true]);
    expect(november[5].map((d) => d.inMonth)).toEqual([true, false, false, false, false, false, false]);
    expect(november.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('marks today, and only today', () => {
    expect(november.flat().filter((d) => d.isToday).map((d) => d.date)).toEqual(['2026-11-13']);
    expect(monthGrid(sessions, 2026, 11, '2026-11-13').flat().some((d) => d.isToday)).toBe(false);
  });

  it('counts the sessions of each day and whether one met the pace', () => {
    const day = (date: string) => november.flat().find((d) => d.date === date);
    expect(day('2026-11-01')).toMatchObject({ sessions: 1, met: false });
    expect(day('2026-11-10')).toMatchObject({ sessions: 2, met: true });
    expect(day('2026-11-11')).toMatchObject({ sessions: 0, met: false });
    // A day of the next month that fills the last row still shows what was played.
    expect(day('2026-12-02')).toMatchObject({ inMonth: false, sessions: 1, met: true });
  });

  it('fits a month that starts on a Monday into four rows', () => {
    const february = monthGrid([], 2027, 1, '2026-11-13');
    expect(february).toHaveLength(4);
    expect(february.flat().every((d) => d.inMonth && d.sessions === 0 && !d.met)).toBe(true);
    expect(february[0][0].date).toBe('2027-02-01');
    expect(february[3][6].date).toBe('2027-02-28');
  });

  it('handles a leap February and rolls a month index into the next or previous year', () => {
    expect(monthGrid([], 2028, 1, '2028-02-29').flat().filter((d) => d.inMonth)).toHaveLength(29);
    expect(monthGrid([], 2026, 12, '2026-11-13')).toEqual(monthGrid([], 2027, 0, '2026-11-13'));
    expect(monthGrid([], 2027, -1, '2026-11-13')).toEqual(monthGrid([], 2026, 11, '2026-11-13'));
  });
});

// ---------- totals ----------

describe('weekNumbers', () => {
  const sessions = [
    session({ date: '2026-11-01', counts: counts({ specific_praise: 9, question: 9 }) }), // two weeks back: ignored
    session({ date: '2026-11-02', counts: counts({ specific_praise: 1, description: 2, question: 5, command: 1 }) }),
    session({ date: '2026-11-08', counts: counts({ reflection: 3, criticism: 1 }) }),
    session({ date: '2026-11-09', counts: counts({ specific_praise: 4, reflection: 1, description: 3, question: 2 }) }),
    session({ date: '2026-11-13', counts: counts({ specific_praise: 2, description: 5, command: 1 }) }),
  ];

  it('totals each skill and the sentences to swap, Monday to Sunday', () => {
    expect(weekNumbers(sessions, '2026-11-13')).toEqual({
      thisWeek: { from: '2026-11-09', to: '2026-11-15', sessions: 2, specific_praise: 6, reflection: 1, description: 8, avoid: 3 },
      lastWeek: { from: '2026-11-02', to: '2026-11-08', sessions: 2, specific_praise: 1, reflection: 3, description: 2, avoid: 7 },
    });
  });

  it('gives the same weeks on the Monday and on the Sunday', () => {
    expect(weekNumbers(sessions, '2026-11-09')).toEqual(weekNumbers(sessions, '2026-11-13'));
    expect(weekNumbers(sessions, '2026-11-15')).toEqual(weekNumbers(sessions, '2026-11-13'));
    expect(weekNumbers(sessions, '2026-11-16').lastWeek.from).toBe('2026-11-09');
  });

  it('is all zeros with no sessions', () => {
    const zero = { sessions: 0, specific_praise: 0, reflection: 0, description: 0, avoid: 0 };
    expect(weekNumbers([], '2026-11-13')).toEqual({
      thisWeek: { from: '2026-11-09', to: '2026-11-15', ...zero },
      lastWeek: { from: '2026-11-02', to: '2026-11-08', ...zero },
    });
  });
});

describe('totalsOf', () => {
  it('is all zeros with no sessions', () => {
    expect(totalsOf([])).toEqual({ sessions: 0, days: 0, seconds: 0, met: 0, specific_praise: 0, reflection: 0, description: 0, avoid: 0 });
  });

  it('adds up sessions, days, time and counts', () => {
    const sessions = [
      session({ date: '2026-11-12', durationSec: 60, counts: counts({ specific_praise: 1, question: 4 }) }),
      session({ date: '2026-11-13', durationSec: 40, counts: counts({ reflection: 2, description: 3, command: 1 }) }),
      session({ date: '2026-11-13', durationSec: 300, met: true, counts: counts({ specific_praise: 10, reflection: 10, description: 10, question: 2 }) }),
    ];
    expect(totalsOf(sessions)).toEqual({ sessions: 3, days: 2, seconds: 400, met: 1, specific_praise: 11, reflection: 12, description: 13, avoid: 7 });
  });
});

// ---------- plan ----------

describe('planDayOf', () => {
  it('is day 1 before the first session', () => {
    expect(planDayOf([], '2026-11-13')).toBe(1);
  });

  it('counts calendar days from the first session, in whatever order they were saved', () => {
    const sessions = on(['2026-11-11', '2026-11-09', '2026-11-12']);
    expect(planDayOf(sessions, '2026-11-09')).toBe(1);
    expect(planDayOf(sessions, '2026-11-13')).toBe(5);
    expect(planDayOf(sessions, '2026-12-06')).toBe(28);
  });

  it('stops at the last day of the plan and never goes below day 1', () => {
    const sessions = on(['2026-11-09']);
    expect(planDayOf(sessions, '2027-03-01')).toBe(PLAN_DAYS);
    expect(planDayOf(sessions, '2026-11-01')).toBe(1);
  });
});

// ---------- the first visit ----------

describe('beforeAfter', () => {
  it('has neither round before the first visit', () => {
    expect(beforeAfter(on(['2026-11-13']))).toEqual({ before: null, after: null });
  });

  it('picks the two rounds of the first visit', () => {
    const before = session({ kind: 'first_before', startedAt: '2026-11-09T18:00:00.000Z' });
    const after = session({ kind: 'first_after', startedAt: '2026-11-09T18:04:00.000Z' });
    expect(beforeAfter([session(), after, before, session()])).toEqual({ before, after });
  });

  it('shows the first round alone until the second is played', () => {
    const before = session({ kind: 'first_before' });
    expect(beforeAfter([before])).toEqual({ before, after: null });
  });

  it('keeps the earliest first visit when it was played again', () => {
    const before = session({ kind: 'first_before', startedAt: '2026-11-09T18:00:00.000Z' });
    const after = session({ kind: 'first_after', startedAt: '2026-11-09T18:04:00.000Z' });
    const again = [
      session({ kind: 'first_before', startedAt: '2026-11-12T08:00:00.000Z' }),
      session({ kind: 'first_after', startedAt: '2026-11-12T08:04:00.000Z' }),
    ];
    expect(beforeAfter([...again, before, after])).toEqual({ before, after });
  });

  it('never pairs a first round with an "after" that came earlier', () => {
    const stray = session({ kind: 'first_after', startedAt: '2026-11-08T10:00:00.000Z' });
    const before = session({ kind: 'first_before', startedAt: '2026-11-09T18:00:00.000Z' });
    expect(beforeAfter([stray, before])).toEqual({ before, after: null });
  });
});

// ---------- patterns ----------

describe('sessionPatterns', () => {
  const find = (s: SavedSession, id: string) => sessionPatterns(s).find((p) => p.id === id);

  it('finds nothing in a session saved without sentences', () => {
    expect(sessionPatterns(session())).toEqual([]);
  });

  it('finds nothing a short, varied session cannot support', () => {
    const sentences = [say('You are stacking the blocks.', 'description', 2), say('What is that?', 'question', 9)];
    expect(sessionPatterns(session({ durationSec: 60, sentences }))).toEqual([]);
  });

  describe('questions in a row', () => {
    it('reports the longest run and where it began', () => {
      const sentences = [
        say('What is that?', 'question', 3),
        say('Is it a tower?', 'question', 8),
        say('You put the red one on top.', 'description', 14),
        say('Which one is next?', 'question', 71),
        say('Do you want the blue one?', 'question', 76),
        say('Is it tall?', 'question', 80),
        say('How many are there?', 'question', 85),
        say('Blocks.', 'neutral', 90),
      ];
      expect(find(session({ sentences }), 'question_run')).toEqual({
        id: 'question_run',
        title: 'Four questions in a row',
        detail: 'Starting at 1:11: “Which one is next?”',
        count: 4,
      });
    });

    it('needs three, and reads the sentences in the order they were said', () => {
      const two = [say('What is that?', 'question', 3), say('Is it a tower?', 'question', 8), say('A tower.', 'reflection', 12)];
      expect(find(session({ sentences: two }), 'question_run')).toBeUndefined();
      const shuffled = [say('Is it tall?', 'question', 20), say('What is that?', 'question', 3), say('Is it a tower?', 'question', 8)];
      expect(find(session({ sentences: shuffled }), 'question_run')?.detail).toBe('Starting at 0:03: “What is that?”');
    });

    it('is broken by a disputed or uncoded sentence, so the run is never overstated', () => {
      const sentences = [
        say('What is that?', 'question', 3),
        say('Is it a tower?', 'question', 8),
        say('You like that one?', 'question', 12, { disputed: true }),
        say('Is it tall?', 'question', 20),
        say('Hmm mm.', 'unknown', 24),
        say('How many are there?', 'question', 30),
      ];
      expect(find(session({ sentences }), 'question_run')).toBeUndefined();
    });

    it('writes large numbers as digits', () => {
      const sentences = Array.from({ length: 14 }, (_, i) => say(`Is it number ${i}?`, 'question', i * 4));
      expect(find(session({ sentences }), 'question_run')?.title).toBe('14 questions in a row');
    });
  });

  describe('share of specific praise', () => {
    const talk = (praises: number, others: number): SavedSentence[] => [
      ...Array.from({ length: praises }, (_, i) => say(`I like how gently you set down block ${i}.`, 'specific_praise', i * 5)),
      ...Array.from({ length: others }, (_, i) => say(`The block ${i} is here.`, 'description', 100 + i * 5)),
    ];

    it('is the praises over everything that was counted', () => {
      expect(find(session({ sentences: talk(2, 6) }), 'praise_share')).toEqual({
        id: 'praise_share',
        title: 'Specific praise was 25% of what you said',
        detail: '2 of 8 sentences named exactly what you liked.',
        count: 2,
      });
    });

    it('leaves disputed and uncoded sentences out of the share', () => {
      const sentences = [...talk(2, 2), say('Uh.', 'unknown', 200), say('Nice tower you built.', 'specific_praise', 210, { disputed: true })];
      expect(find(session({ sentences }), 'praise_share')?.title).toBe('Specific praise was 50% of what you said');
    });

    it('stays silent without a praise or with too few sentences', () => {
      expect(find(session({ sentences: talk(0, 8) }), 'praise_share')).toBeUndefined();
      expect(find(session({ sentences: talk(1, 2) }), 'praise_share')).toBeUndefined();
    });
  });

  describe('pace', () => {
    const at = (starts: number[]): SavedSentence[] => starts.map((sec, i) => say(`You moved piece ${i}.`, 'description', sec));

    it('compares the first minute with the last', () => {
      const sentences = at([2, 10, 20, 35, 50, 120, 250, 290]);
      expect(find(session({ durationSec: 300, sentences }), 'pace')).toEqual({
        id: 'pace',
        title: 'You said less in the last minute',
        detail: '5 sentences in the first minute, 2 in the last.',
        count: 3,
      });
      const faster = at([5, 245, 260, 270, 299]);
      expect(find(session({ durationSec: 300, sentences: faster }), 'pace')).toMatchObject({
        title: 'You said more in the last minute',
        detail: '1 sentence in the first minute, 4 in the last.',
        count: 3,
      });
    });

    it('stays silent when the two minutes are close, or the session is under two minutes', () => {
      expect(find(session({ durationSec: 300, sentences: at([5, 20, 40, 250, 280]) }), 'pace')).toBeUndefined();
      expect(find(session({ durationSec: 60, sentences: at([1, 2, 3, 4, 5, 59]) }), 'pace')).toBeUndefined();
    });

    it('says nothing about a last minute in which nothing was said: the round may have ended early', () => {
      // Ended after seven seconds of a five-minute round: the engine measures it as 150 seconds, half the plan.
      expect(find(session({ durationSec: 150, sentences: at([1, 2, 3, 4, 5, 6]) }), 'pace')).toBeUndefined();
    });
  });

  describe('a sentence said again', () => {
    it('ignores case and punctuation and quotes the sentence as first said', () => {
      const sentences = [
        say('Good job!', 'general_praise', 5),
        say('You are drawing a sun.', 'description', 12),
        say('good job', 'general_praise', 30),
        say('Good  job.', 'general_praise', 44),
      ];
      expect(find(session({ sentences }), 'repeat')).toEqual({ id: 'repeat', title: 'One sentence, three times', detail: '“Good job!”', count: 3 });
    });

    it('says "twice" for two, and picks the most repeated sentence', () => {
      const sentences = [
        say('Nice.', 'general_praise', 5), say('Nice.', 'general_praise', 9),
        say('What is that?', 'question', 15), say('What is that?', 'question', 25), say('What is that?', 'question', 40),
      ];
      expect(find(session({ sentences }), 'repeat')).toMatchObject({ title: 'One sentence, three times', detail: '“What is that?”' });
      expect(find(session({ sentences: sentences.slice(0, 3) }), 'repeat')).toMatchObject({ title: 'One sentence, twice', count: 2 });
    });

    it('stays silent when every sentence is different', () => {
      const sentences = [say('You drew a sun.', 'description', 5), say('You drew a moon.', 'description', 9)];
      expect(find(session({ sentences }), 'repeat')).toBeUndefined();
    });
  });

  describe('the opener used most', () => {
    it('is the first two words most sentences began with', () => {
      const sentences = [
        say('You are stacking the blocks.', 'description', 5),
        say('What is that?', 'question', 12),
        say('you are building a tall tower', 'description', 20),
        say("You are making a bridge!", 'description', 31),
        say('I like how you shared.', 'specific_praise', 40),
      ];
      expect(find(session({ sentences }), 'opener')).toEqual({
        id: 'opener',
        title: 'Your most used opener: “You are”',
        detail: '3 of 5 sentences began this way.',
        count: 3,
      });
    });

    it('needs three sentences, and more than one sentence said again', () => {
      const two = [say('You are stacking.', 'description', 5), say('You are building.', 'description', 12), say('A tower.', 'reflection', 20)];
      expect(find(session({ sentences: two }), 'opener')).toBeUndefined();
      const same = [say('Good job!', 'general_praise', 5), say('Good job.', 'general_praise', 12), say('good job', 'general_praise', 20)];
      expect(sessionPatterns(session({ durationSec: 60, sentences: same })).map((p) => p.id)).toEqual(['repeat']);
    });
  });

  it('lists every finding a rich session supports, in a fixed order, in calm words', () => {
    const sentences = [
      say('What is that?', 'question', 2),
      say('What is this one?', 'question', 8),
      say('What is that?', 'question', 15),
      say('What is it called?', 'question', 22),
      say('You are stacking the red block.', 'description', 30),
      say('I like how gently you put that down.', 'specific_praise', 41),
      say('You are building a bridge.', 'description', 55),
      say('A bridge.', 'reflection', 130),
      say('Put it there.', 'command', 262),
    ];
    const found = sessionPatterns(session({ durationSec: 300, sentences }));
    expect(found.map((p) => p.id)).toEqual(['question_run', 'praise_share', 'pace', 'repeat', 'opener']);
    expect(found.map((p) => p.count)).toEqual([4, 1, 6, 2, 4]);
    for (const p of found) {
      expect(`${p.title} ${p.detail}`).not.toMatch(/\b(wrong|bad|mistake|should|don[’']t)\b/i);
      expect(p.title).not.toBe('');
      expect(p.detail).not.toBe('');
    }
  });

  it('does not change the session it reads', () => {
    const sentences = [say('Is it tall?', 'question', 20), say('What is that?', 'question', 3)];
    const s = session({ sentences });
    sessionPatterns(s);
    expect(s.sentences.map((x) => x.startSec)).toEqual([20, 3]);
  });
});
