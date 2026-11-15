import { describe, expect, it } from 'vitest';
import { codeSentence } from '../coding/classify';
import type { SavedSentence } from '../types';
import { EXPLAIN_SYSTEM, explainInput, keepExplanation, parseExplainInput, tidyExplanation } from './explain';

const said = (text: string): SavedSentence => {
  const coded = codeSentence(text);
  return { text, code: coded.code, rule: coded.rule, startSec: 5, atSec: 7 };
};

describe('"Why?" next to a sentence', () => {
  it('sends the sentence, its code and its rule, and nothing for a sentence the rules could not read', () => {
    expect(explainInput(said('What are you building?'))).toEqual({ said: 'What are you building?', code: 'Question', rule: 'question_mark' });
    expect(explainInput(said('你好'))).toBeNull();
  });
  it('is accepted by the server check, which refuses anything else', () => {
    const input = explainInput(said('Put it here.'));
    expect(parseExplainInput(JSON.parse(JSON.stringify(input)))).toEqual(input);
    expect(parseExplainInput(null)).toBeNull();
    expect(parseExplainInput({ ...input, code: 'Made up' })).toBeNull();
    expect(parseExplainInput({ ...input, code: 'Not coded' })).toBeNull();
    expect(parseExplainInput({ ...input, said: 'x'.repeat(500) })).toBeNull();
    expect(parseExplainInput({ ...input, rule: 'x'.repeat(80) })).toBeNull();
  });
  it('keeps a suggestion only when the rules code it as a skill, and only for a sentence that is not one', () => {
    const question = said('What are you building?');
    expect(keepExplanation({ why: 'It asks.', tryInstead: "You're building a tall tower." }, question).tryInstead).toBe("You're building a tall tower.");
    expect(keepExplanation({ why: 'It asks.', tryInstead: 'What color is it?' }, question).tryInstead).toBeNull();
    expect(keepExplanation({ why: 'It asks.', tryInstead: 'Put the red one on top.' }, question).tryInstead).toBeNull();
    const description = said('You are stacking the red block.');
    expect(keepExplanation({ why: 'It says what she does.', tryInstead: "You're stacking it high." }, description).tryInstead).toBeNull();
    const vague = said('Good job!');
    expect(keepExplanation({ why: 'It does not say what.', tryInstead: 'Good job stacking so gently.' }, vague).tryInstead).toBe('Good job stacking so gently.');
  });
  it('trims the answer and treats an empty suggestion as none', () => {
    expect(tidyExplanation({ why: `  ${'a'.repeat(500)} `, tryInstead: '   ' })).toEqual({ why: 'a'.repeat(400), tryInstead: null });
  });
  it('tells the model the code is final and the words the product never uses', () => {
    expect(EXPLAIN_SYSTEM).toMatch(/The code is final/);
    expect(EXPLAIN_SYSTEM).toMatch(/Never use the words wrong, bad, mistake, should or don't/);
  });
});
