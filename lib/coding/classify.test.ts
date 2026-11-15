import { describe, expect, it } from 'vitest';
import { BUCKET } from '../types';
import { codeSentence, codeTurn, isReflection, splitSentences } from './classify';
import { EXAMPLES } from './examples';

describe('codeSentence on the labeled examples', () => {
  it.each(EXAMPLES)('%s -> %s', (text, expected, childSaid) => {
    const coded = codeSentence(text, { childLastSaid: childSaid ?? null });
    expect(coded.code).toBe(expected);
    expect(coded.bucket).toBe(BUCKET[expected]);
    expect(coded.rule.length).toBeGreaterThan(0);
  });
});

describe('specific praise names the behavior', () => {
  it('recognizes gentle, sharing, patient and tidy', () => {
    expect(codeSentence('Great job stacking those blocks so carefully.').namedBehavior).toBe('gentle');
    expect(codeSentence('Thank you for sharing the red crayon.').namedBehavior).toBe('sharing');
    expect(codeSentence("You're doing a great job waiting your turn.").namedBehavior).toBe('patient');
    expect(codeSentence('Good job putting the lid back on.').namedBehavior).toBe('tidy');
  });
  it('leaves it empty when nothing is named', () => {
    expect(codeSentence('Nice tower!').namedBehavior).toBeUndefined();
  });
});

describe('turns', () => {
  it('splits a turn into sentences', () => {
    expect(splitSentences('Wow, good job! What is it?')).toEqual(['Wow, good job!', 'What is it?']);
  });
  it('codes each sentence of a typical first answer', () => {
    const coded = codeTurn('Wow, good job! What is it?');
    expect(coded.map((c) => c.code)).toEqual(['general_praise', 'question']);
  });
  it('a reflection needs the child to have spoken', () => {
    expect(codeSentence('You made a big tower.').code).toBe('description');
    expect(codeSentence('You made a big tower.', { childLastSaid: 'I made a big tower!' }).code).toBe('reflection');
  });
  it('an unrelated sentence is not a reflection', () => {
    expect(isReflection('The sky is blue', 'I made a big tower')).toBe(false);
  });
  it('never throws on odd input', () => {
    for (const odd of ['', '   ', '???', '12345', 'a'.repeat(5000), '😀😀', 'SELECT * FROM users;']) {
      expect(() => codeTurn(odd)).not.toThrow();
    }
  });
});
