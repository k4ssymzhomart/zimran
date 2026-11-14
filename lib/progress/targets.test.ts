import { describe, expect, it } from 'vitest';
import { codeTurn } from '../coding/classify';
import type { CodedSentence } from '../types';
import { biggestLever, compareRounds, countCodes, paceTargets, summarizeRound } from './targets';

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
    expect(compareRounds(before, after).improved).toBe(false);
  });
});
