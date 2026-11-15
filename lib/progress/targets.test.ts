import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import type { CodedSentence } from '../types';
import { biggestLever, CHANGE_TEXT, compareRounds, countCodes, paceTargets, skillMix, summarizeRound } from './targets';

const code = (lines: [string, string?][]): CodedSentence[] =>
  lines.flatMap(([text, child]) => codeTurn(text, { childLastSaid: child ?? null }));

describe('pace targets', () => {
  it('five minutes is the clinic norm', () => {
    expect(paceTargets(300)).toEqual({ specific_praise: 10, reflection: 10, description: 10, maxAvoid: 3 });
  });
  it('shorter rounds keep the same pace', () => {
    expect(paceTargets(60)).toEqual({ specific_praise: 2, reflection: 2, description: 2, maxAvoid: 0 });
    expect(paceTargets(150)).toEqual({ specific_praise: 5, reflection: 5, description: 5, maxAvoid: 1 });
    expect(paceTargets(30).description).toBe(1);
  });
  it('rounds to the nearest whole sentence: 40 seconds asks for one of each', () => {
    // 10 in 300 s is 1.33 in 40 s. Typed on a phone, two of each in 40 seconds is out of reach, so the second
    // round of the first visit asks for one of each.
    expect(paceTargets(40)).toEqual({ specific_praise: 1, reflection: 1, description: 1, maxAvoid: 0 });
    expect([30, 60, 90, 120, 150, 180, 240, 300].map((s) => paceTargets(s).description)).toEqual([1, 2, 3, 4, 5, 6, 8, 10]);
    expect(paceTargets(1).description).toBe(1);
  });
});

describe('round summary', () => {
  const typicalFirstRound = code([
    ['Wow, good job! What is it?'],
    ['Is that a tower?'],
    ['Put the red one on top.'],
    ['What color is this?'],
    ["You're stacking them."],
  ]);

  it('counts every code', () => {
    const c = countCodes(typicalFirstRound);
    expect(c.question).toBe(3);
    expect(c.command).toBe(1);
    expect(c.general_praise).toBe(1);
    expect(c.description).toBe(1);
    expect(c.avoid).toBe(4);
    expect(c.target).toBe(1);
  });
  it('names questions as the lever for a typical first round', () => {
    const r = summarizeRound(typicalFirstRound, 60);
    expect(r.met).toBe(false);
    expect(r.lever).toBe('question');
    expect(r.leverText).toContain('descriptions');
  });
  it('names the widest gap when the avoid count is fine', () => {
    const coded = code([["You're stacking them."], ['You put it on top.'], ['Nice tower!'], ['Great job waiting.']]);
    const r = summarizeRound(coded, 60);
    expect(r.counts.avoid).toBe(0);
    expect(r.lever).toBe('reflection');
  });
  it('a round at the clinic pace is met and has no lever', () => {
    const coded = code([
      ["You're stacking them."],
      ['You put it on top.'],
      ['Nice tower!'],
      ['Great job waiting your turn.'],
      ['You made a tower.', 'I made a tower!'],
      ['A train.', 'It is a train.'],
    ]);
    const r = summarizeRound(coded, 60);
    expect(r.met).toBe(true);
    expect(r.lever).toBeNull();
    expect(r.leverText).toBeNull();
  });
  it('sentences that could not be coded are not counted', () => {
    expect(countCodes(code([['...'], ['Молодец!']])).target).toBe(0);
    expect(countCodes(code([['...'], ['Молодец!']])).neutral).toBe(0);
  });
  it('an empty round does not crash and points at descriptions first', () => {
    const r = summarizeRound([], 60);
    expect(r.met).toBe(false);
    expect(r.lever).toBe('description');
    expect(biggestLever(r.counts, r.targets)).toBe('description');
  });
});

describe('round 1 against round 2', () => {
  it('reports the change per minute, best news first', () => {
    const before = summarizeRound(code([['What is it?'], ['Is that a tower?'], ['What color is this?'], ['Nice!']]), 60);
    const after = summarizeRound(
      code([["You're stacking them."], ['You put it on top.'], ['You picked the blue one.'], ['Is it tall?']]),
      40,
    );
    const change = compareRounds(before, after);
    expect(change.perMinute.description).toBe(4.5);
    expect(change.perMinute.avoid).toBe(-1.5);
    expect(change.improved).toBe(true);
    expect(change.lines[0]).toBe('+4.5 descriptions per minute');
    expect(change.lines).toContain('−1.5 questions, commands and corrections per minute');
  });
  it('does not call it an improvement when avoids went up', () => {
    const before = summarizeRound(code([["You're stacking them."]]), 60);
    const after = summarizeRound(code([["You're stacking them."], ['You put it on top.'], ['Stop that.'], ['No.']]), 60);
    const change = compareRounds(before, after);
    expect(change.improved).toBe(false);
    // More descriptions and more corrections: a mixed round is not "harder" and not "improved".
    expect(change.verdict).toBe('same');
  });

  const DESC = ["You're stacking them."] as [string];
  const ONE = code([DESC]);
  const QUESTIONS = code([['What is it?'], ['Is that a tower?'], ['What color is this?']]);
  const PACE_60 = code([['Nice tower!'], ['Great job stacking.'], ['You made a tower.', 'I made a tower!'], ['It is wobbly.', 'It is wobbly.'], ["You're stacking them."], ['You put it on top.']]);
  /** Twice the pace of a minute: four of each. */
  const DOUBLE_60 = [...PACE_60, ...PACE_60];

  it('says improved when more of a skill was said', () => {
    const change = compareRounds(summarizeRound(QUESTIONS, 60), summarizeRound(code([DESC, ['You put it on top.'], ['Is it tall?']]), 40));
    expect(change).toMatchObject({ improved: true, verdict: 'improved' });
  });

  it('an equal second round is not an improvement, though it was shorter', () => {
    // One description in 60 s, one in 40 s: the rate went up, the parent did the same thing.
    const same = compareRounds(summarizeRound(ONE, 60), summarizeRound(ONE, 40));
    // Changed by design: this read 0.5. The screens count their check marks from the sign of `perMinute`,
    // so a rise that is not listed as good news reads zero and the mark cannot land on another line.
    expect(same.perMinute.description).toBe(0);
    expect(same.lines).toEqual([]);
    expect(same).toMatchObject({ improved: false, verdict: 'same' });
    // The same sentence and an early end: the round is measured over 20 s, and it is still the same.
    const endedEarly = compareRounds(summarizeRound(ONE, 60), { ...summarizeRound(ONE, 40), seconds: 20 });
    expect(endedEarly.perMinute.description).toBe(0);
    expect(endedEarly.lines).toEqual([]);
    expect(endedEarly.improved).toBe(false);
  });

  it('the same number of questions in a shorter round 2 is not more questions', () => {
    // One description and one question in 60 s, then three descriptions and one question in 40 s.
    const before = summarizeRound(code([DESC, ['What are you building?']]), 60);
    const after = summarizeRound(code([DESC, ['You put it on top.'], ['You are lining them up.'], ['What is that?']]), 40);
    const change = compareRounds(before, after);
    expect(change.perMinute.avoid).toBe(0.5);
    expect(change.lines).toEqual(['+3.5 descriptions per minute']);
    expect(change).toMatchObject({ improved: true, verdict: 'improved' });
    // Two rounds with the very same sentences: nothing to report, and never "harder".
    const SAME = code([['Good job!'], DESC, ['What are you building?']]);
    const equal = compareRounds(summarizeRound(SAME, 60), summarizeRound(SAME, 40));
    expect(equal.lines).toEqual([]);
    expect(equal).toMatchObject({ improved: false, verdict: 'same' });
    // One more question than before is still reported.
    const more = compareRounds(summarizeRound(SAME, 60), summarizeRound(code([['Good job!'], DESC, ['What is it?'], ['Is it tall?']]), 40));
    expect(more.lines).toEqual(['+2 questions, commands and corrections per minute']);
    expect(more.verdict).toBe('harder');
  });

  it('a silent second round is not an improvement', () => {
    const change = compareRounds(summarizeRound(QUESTIONS, 60), summarizeRound([], 40));
    // Changed by design: this read -3. Fewer questions because nothing was said is not good news, so it reads zero.
    expect(change.perMinute.avoid).toBe(0);
    expect(change.lines.some((l) => l.includes('questions'))).toBe(false);
    expect(change).toMatchObject({ improved: false, verdict: 'silent' });
    expect(compareRounds(summarizeRound([], 60), summarizeRound([], 40))).toMatchObject({ lines: [], improved: false, verdict: 'silent' });
  });

  it('shows no minus for a skill whose target was met', () => {
    // Changed by design: 40 seconds now asks for two of each (see the pace targets), so round 2 holds two of each
    // and round 1 four of each.
    const before = summarizeRound(DOUBLE_60, 60);
    const after = summarizeRound(PACE_60, 40);
    expect(before.met).toBe(true);
    expect(after.met).toBe(true);
    const change = compareRounds(before, after);
    // 4 a minute, then 3 a minute: the rate fell, and round 2 still met its own targets.
    expect(change.perMinute).toMatchObject({ specific_praise: -1, reflection: -1, description: -1 });
    expect(change.lines).toEqual([]);
    expect(change).toMatchObject({ improved: false, verdict: 'held' });
  });

  it('says harder, with the numbers, when round 2 fell short and nothing went up', () => {
    const change = compareRounds(summarizeRound(PACE_60, 60), summarizeRound(code([['Nice tower!'], ['What is it?'], ['Put it here.']]), 40));
    expect(change.verdict).toBe('harder');
    expect(change.improved).toBe(false);
    expect(change.lines).toContain('−2 descriptions per minute');
    expect(change.lines).toContain('−2 reflections per minute');
    expect(change.lines).toContain('+3 questions, commands and corrections per minute');
    // One specific praise meets the 40-second target of one, so it has no minus line.
    expect(change.lines.some((l) => l.includes('specific praise'))).toBe(false);
  });

  it('a skill whose target was met has no minus line, also next to skills that fell short', () => {
    const after = summarizeRound(code([['Nice tower!'], ['Great job stacking.'], ['What is it?']]), 40);
    const change = compareRounds(summarizeRound(DOUBLE_60, 60), after);
    expect(after.counts.specific_praise).toBeGreaterThanOrEqual(after.targets.specific_praise);
    expect(change.lines.some((l) => l.includes('specific praise'))).toBe(false);
    expect(change.lines).toContain('−4 descriptions per minute');
  });

  // What the screens do with a change: one check mark per sign that reads as good news, given to the first lines.
  const checks = (c: ReturnType<typeof compareRounds>): number =>
    (['description', 'reflection', 'specific_praise'] as const).filter((k) => c.perMinute[k] > 0).length + (c.perMinute.avoid < 0 ? 1 : 0);
  const R1 = (lines: [string, string?][]) => summarizeRound(code(lines), 60);
  const R2 = (lines: [string, string?][]) => summarizeRound(code(lines), 40);
  const D1: [string] = ["You're stacking them."];
  const D2: [string] = ['You put it on top.'];
  const RF: [string, string] = ['You made a tower.', 'I made a tower!'];
  const RF2: [string, string] = ['It is wobbly.', 'It is wobbly.'];
  const P1: [string] = ['Nice tower!'];
  const Q1: [string] = ['What is it?'];
  const Q2: [string] = ['Is it tall?'];

  it('the check marks a screen counts from the signs land only on lines listed as good news', () => {
    // (A) The same one description in a shorter round, and two reflections fewer: no mark on the reflections line.
    const a = compareRounds(R1([D1, RF, RF2]), R2([D1]));
    expect(a.lines).toEqual(['−2 reflections per minute']);
    expect(a.perMinute.description).toBe(0);
    expect(checks(a)).toBe(0);
    // (B) The same description and one question more.
    const b = compareRounds(R1([D1]), R2([D1, Q1]));
    expect(b.lines).toEqual(['+1.5 questions, commands and corrections per minute']);
    expect(checks(b)).toBe(0);
    // (C) Fewer questions is the one piece of good news; the reflections line under it gets no mark.
    const c = compareRounds(R1([D1, D2, RF, P1, Q1, Q2]), R2([D1, D2, P1]));
    expect(c.lines).toEqual(['−2 questions, commands and corrections per minute', '−1 reflections per minute']);
    expect(checks(c)).toBe(1);
    // (D) Nothing said in round 2.
    const d = compareRounds(R1([Q1, D1]), R2([]));
    expect(d.lines).toEqual(['−1 descriptions per minute']);
    expect(d.perMinute.avoid).toBe(0);
    expect(checks(d)).toBe(0);
  });

  it('a real gain keeps its line, its sign and its mark', () => {
    const gain = compareRounds(R1([D1]), R2([D1, D2]));
    expect(gain.lines).toEqual(['+2 descriptions per minute']);
    expect(gain.perMinute.description).toBe(2);
    expect(checks(gain)).toBe(1);
    // Good news always comes first, so "the first n lines" are the right ones.
    const two = compareRounds(R1([Q1, Q2, D1]), R2([D1, D2, Q1]));
    expect(two.lines).toEqual(['+2 descriptions per minute', '−0.5 questions, commands and corrections per minute']);
    expect(checks(two)).toBe(2);
    // Declines keep their sign: only rises that are not gains are flattened.
    expect(compareRounds(R1([D1, D2]), R2([D1])).perMinute.description).toBe(-0.5);
    expect(compareRounds(R1([D1]), R2([D1, Q1])).perMinute.avoid).toBe(1.5);
  });

  it('counts fewer questions as good news only when the parent kept talking', () => {
    const change = compareRounds(summarizeRound(QUESTIONS, 60), summarizeRound(code([['That is a red one.'], ['Is it tall?']]), 40));
    expect(change.lines).toEqual(['−1.5 questions, commands and corrections per minute']);
    // Fewer questions and still no skill sentence: not yet an improvement.
    expect(change).toMatchObject({ improved: false, verdict: 'same' });
  });

  it('has one calm sentence for every verdict', () => {
    for (const text of Object.values(CHANGE_TEXT)) {
      expect(text.length).toBeGreaterThan(10);
      expect(text).not.toMatch(/\b(wrong|bad|mistake|should|don't|dont|worse|failed)\b/i);
    }
    expect(Object.keys(CHANGE_TEXT).sort()).toEqual(['harder', 'held', 'improved', 'same', 'silent']);
  });
});

describe('skill mix', () => {
  it('counts the skill sentences out of everything that was coded', () => {
    const r = summarizeRound(
      code([['Nice tower!'], ['You made a tower.', 'I made a tower!'], ["You're stacking them."], ['You put it on top.'], ['Great job stacking.'], ['What is it?'], ['Good job!'], ['Молодец!']]),
      60,
    );
    // Changed by design: the line says "specific praise", the product's name for the skill everywhere else.
    expect(skillMix(r)).toEqual({ skills: 5, total: 7, line: '5 of your 7 sentences were specific praise, reflection or description.' });
  });
  it('has no line when nothing was said', () => {
    expect(skillMix(summarizeRound([], 60))).toEqual({ skills: 0, total: 0, line: null });
  });
  it('reads well for a single sentence', () => {
    expect(skillMix(summarizeRound(code([["You're stacking them."]]), 60)).line).toBe('Your one sentence was specific praise, reflection or description.');
    expect(skillMix(summarizeRound(code([['What is it?']]), 60)).line).toBe('Your one sentence was something else this time.');
    expect(skillMix(summarizeRound(code([['What is it?'], ['Is it tall?']]), 60)).line).toBe('0 of your 2 sentences were specific praise, reflection or description.');
  });
  it('does not read as "your praise was not praise" after two general praises', () => {
    const line = skillMix(summarizeRound(codeTurn('Good job! Awesome!'), 60)).line;
    expect(line).toBe('0 of your 2 sentences were specific praise, reflection or description.');
  });
  it('leaves reflections out of the line for live play, which does not count them', () => {
    const live = summarizeRound(code([["You're stacking them."], ['Nice tower!'], ['What is it?']]), 60, { reflections: false });
    expect(skillMix(live).line).toBe('2 of your 3 sentences were specific praise or description.');
  });
  it('works on a saved session record, which has counts only', () => {
    expect(skillMix({ counts: summarizeRound(code([["You're stacking them."], ['What is it?']]), 60).counts })).toMatchObject({ skills: 1, total: 2 });
  });
});
