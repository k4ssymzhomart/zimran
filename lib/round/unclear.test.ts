import { describe, expect, it, vi } from 'vitest';
import type { CodedSentence, CodingContext } from '../types';
import { initialRound, ringProgress, roundReducer, type RoundEvent, type RoundState } from './session';

/**
 * The classifier marks a sentence it cannot make out with a rule named 'unclear_...' and codes it
 * neutral or general praise. This stands in for that marking on any sentence with the word "blorp",
 * so the test is about the round and not about which made-up words the classifier catches today.
 */
vi.mock('../coding/classify', async (importOriginal) => {
  const real = await importOriginal<typeof import('../coding/classify')>();
  const unclear = (s: CodedSentence): CodedSentence =>
    /blorp/i.test(s.text)
      ? { text: s.text, code: /good/i.test(s.text) ? 'general_praise' : 'neutral', bucket: 'neutral', confidence: 0.3, rule: 'unclear_made_up_words' }
      : s;
  return { ...real, codeTurn: (turn: string, ctx?: CodingContext) => real.codeTurn(turn, ctx).map(unclear) };
});

const START: RoundEvent = { type: 'start', sceneId: 'blocks', seconds: 300, seed: 7 };
const run = (events: RoundEvent[], from: RoundState = initialRound()): RoundState => events.reduce(roundReducer, from);
const say = (text: string): RoundEvent => ({ type: 'say', text });

describe('a sentence the classifier could not make out does not move Mia (E8)', () => {
  const started = run([START, { type: 'tick', dtSec: 1 }]);

  it('neutral or general praise with an unclear_ rule leaves her as she was', () => {
    for (const text of ['Blorp gleep snorp.', 'Good blorp!']) {
      const s = run([say(text)], started);
      expect(s.sentences[0].rule, text).toBe('unclear_made_up_words');
      expect(s.child, text).toEqual(started.child);
      expect(s.combo, text).toBe(started.combo);
      expect(ringProgress(s), text).toEqual(ringProgress(started));
      // She does not smile at words that were not words.
      expect(s.microReaction, text).toBe('Mia keeps playing.');
    }
    // The same codes from a sentence that was read do reach her.
    expect(run([say('Good job!')], started).child.connection).toBeGreaterThan(started.child.connection);
    expect(run([say('That is a red one.')], started).child.connection).toBeGreaterThan(started.child.connection);
  });

  it('the rest of the turn still counts', () => {
    const mixed = run([say('You are stacking the blocks. Blorp gleep snorp.')], started);
    expect(mixed.sentences.map((x) => x.code)).toEqual(['description', 'neutral']);
    expect(mixed.child).toEqual(run([say('You are stacking the blocks.')], started).child);
    expect(mixed.combo).toBe(1);
    // It is listed and counted as neutral talk like any other.
    expect(run([{ type: 'end' }], mixed).result?.counts).toMatchObject({ description: 1, neutral: 1 });
  });
});
