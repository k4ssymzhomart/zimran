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
  const PACE_40 = code([['Nice tower!'], ['It is wobbly.', 'It is wobbly.'], ["You're stacking them."]]);

  it('says improved when more of a skill was said', () => {
    const change = compareRounds(summarizeRound(QUESTIONS, 60), summarizeRound(code([DESC, ['You put it on top.'], ['Is it tall?']]), 40));
    expect(change).toMatchObject({ improved: true, verdict: 'improved' });
  });

  it('an equal second round is not an improvement, though it was shorter', () => {
    // One description in 60 s, one in 40 s: the rate went up, the parent did the same thing.
    const same = compareRounds(summarizeRound(ONE, 60), summarizeRound(ONE, 40));
    expect(same.perMinute.description).toBe(0.5);
    expect(same.lines).toEqual([]);
    expect(same).toMatchObject({ improved: false, verdict: 'same' });
    // The same sentence and an early end: the round is measured over 20 s, and it is still the same.
    const endedEarly = compareRounds(summarizeRound(ONE, 60), { ...summarizeRound(ONE, 40), seconds: 20 });
    expect(endedEarly.perMinute.description).toBe(2);
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
    expect(change.perMinute.avoid).toBe(-3);
    expect(change.lines.some((l) => l.includes('questions'))).toBe(false);
    expect(change).toMatchObject({ improved: false, verdict: 'silent' });
    expect(compareRounds(summarizeRound([], 60), summarizeRound([], 40))).toMatchObject({ lines: [], improved: false, verdict: 'silent' });
  });

  it('shows no minus for a skill whose target was met', () => {
    const before = summarizeRound(PACE_60, 60);
    const after = summarizeRound(PACE_40, 40);
    expect(before.met).toBe(true);
    expect(after.met).toBe(true);
    const change = compareRounds(before, after);
    // 2 a minute, then 1.5 a minute: the rate fell because the shorter round asks for one of each.
    expect(change.perMinute).toMatchObject({ specific_praise: -0.5, reflection: -0.5, description: -0.5 });
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
    // Specific praise met its target of one: no line for it.
    expect(change.lines.some((l) => l.includes('specific praise'))).toBe(false);
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
    expect(skillMix(r)).toEqual({ skills: 5, total: 7, line: '5 of your 7 sentences were praise, reflection or description.' });
  });
  it('has no line when nothing was said', () => {
    expect(skillMix(summarizeRound([], 60))).toEqual({ skills: 0, total: 0, line: null });
  });
  it('reads well for a single sentence', () => {
    expect(skillMix(summarizeRound(code([["You're stacking them."]]), 60)).line).toBe('Your one sentence was praise, reflection or description.');
    expect(skillMix(summarizeRound(code([['What is it?']]), 60)).line).toBe('Your one sentence was something else this time.');
    expect(skillMix(summarizeRound(code([['What is it?'], ['Is it tall?']]), 60)).line).toBe('0 of your 2 sentences were praise, reflection or description.');
  });
  it('leaves reflections out of the line for live play, which does not count them', () => {
    const live = summarizeRound(code([["You're stacking them."], ['Nice tower!'], ['What is it?']]), 60, { reflections: false });
    expect(skillMix(live).line).toBe('2 of your 3 sentences were praise or description.');
  });
  it('works on a saved session record, which has counts only', () => {
    expect(skillMix({ counts: summarizeRound(code([["You're stacking them."], ['What is it?']]), 60).counts })).toMatchObject({ skills: 1, total: 2 });
  });
});
