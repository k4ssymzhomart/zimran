import { describe, expect, it } from 'vitest';
import type { Code, Counts, SavedSentence, SavedSession } from '../../../lib/types';
import { firstVisitRows, fourWeeks, latestStats, lengthWords, milestonesOf, reviewHeadline, reviewRows, signed, trendLine } from './numbers';

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

const said = (text: string, code: Code, startSec: number): SavedSentence => ({ text, code, startSec, atSec: startSec + 2 });

describe('Progress numbers', () => {
  // 2026-11-13 is a Friday: this week runs from Monday 9 Nov, last week from Monday 2 Nov.
  const today = '2026-11-13';

  it('signs a change with a real minus', () => {
    expect([signed(4), signed(-3), signed(0), signed(1.25)]).toEqual(['+4', '−3', '0', '+1.3']);
  });

  it('says what went up this week against the mean of last week', () => {
    const sessions = [
      session({ date: '2026-11-03', counts: counts({ specific_praise: 2, reflection: 3 }) }),
      session({ date: '2026-11-10', counts: counts({ specific_praise: 6, reflection: 4 }) }),
    ];
    expect(trendLine(sessions, today)).toBe('Praise is up four');
    expect(trendLine([session({ date: '2026-11-03' })], today)).toBe('No session yet');
    expect(trendLine([session({ date: '2026-11-10' })], today)).toBe('Your first sessions');
  });

  it('shows a short round as it was played, the same numbers as its review, and keeps reflections out of live play', () => {
    const stats = latestStats([
      session({ counts: counts({ specific_praise: 5 }) }),
      session({ durationSec: 60, kind: 'live', counts: counts({ specific_praise: 2, question: 1 }) }),
    ]);
    // Two praises in one minute are two, not ten.
    expect(stats?.praise).toEqual({ value: 2, delta: '−3' });
    expect(stats?.reflect.value).toBeNull();
    expect(stats?.swap).toEqual({ value: 1, delta: '+1' });
  });

  it('scales a session longer than five minutes down to the five-minute scale', () => {
    const stats = latestStats([session({ durationSec: 600, counts: counts({ description: 20 }) })]);
    expect(stats?.describe.value).toBe(10);
  });

  it('lays out four calendar weeks, oldest first', () => {
    const weeks = fourWeeks([session({ date: '2026-11-10', counts: counts({ description: 7 }) })], today);
    expect(weeks.map((w) => w.from)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
    expect(weeks[3].pace?.describe).toBe(7);
    expect(weeks[0].pace).toBeNull();
  });

  it('compares the first visit per minute, only once both rounds are saved', () => {
    const before = session({ kind: 'first_before', durationSec: 60, startedAt: '2026-11-01T10:00:00Z', counts: counts({ question: 4, command: 1 }) });
    const after = session({ kind: 'first_after', durationSec: 60, startedAt: '2026-11-01T10:10:00Z', counts: counts({ reflection: 4, specific_praise: 1, question: 2, command: 1 }) });
    expect(firstVisitRows([before])).toBeNull();
    expect(firstVisitRows([before, after])?.map((r) => r.delta)).toEqual(['+4', '+1', '−2']);
  });

  it('counts the milestones from what was played', () => {
    const done = milestonesOf([session({ date: '2026-11-11' }), session({ date: '2026-11-12', met: true }), session({ date: '2026-11-13' })]);
    expect(done.map((m) => m.done)).toEqual([true, true, true, false]);
  });
});

describe('Session review numbers', () => {
  it('words the headline and the length', () => {
    expect(reviewHeadline(session({ counts: counts({ specific_praise: 2, reflection: 3, description: 4, question: 4 }) }))).toBe('Nine skills, four to swap.');
    expect([lengthWords(180), lengthWords(60), lengthWords(90)]).toEqual(['Three minutes', 'One minute', '1:30']);
  });

  it('finds the drawn patterns only when the sentences hold them', () => {
    const typed = session({
      durationSec: 180,
      sentences: [
        said('You are stacking the red one.', 'description', 4),
        said('What are you building?', 'question', 19),
        said('Good job stacking so gently.', 'specific_praise', 30),
        said('What color is it?', 'question', 50),
        said('Put it here.', 'command', 120),
      ],
    });
    expect(reviewRows(typed)).toEqual([
      { label: 'Most questions began with', value: '“What”' },
      { label: 'Longest run without a question', value: '130 seconds' },
      { label: 'To swap, first half then second', value: '2, then 1' },
    ]);
    expect(reviewRows(session())).toEqual([]);
  });
});
