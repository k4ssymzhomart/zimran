import { describe, expect, it } from 'vitest';
import { codeSentence } from '../coding/classify';
import { coachPrompt, type CoachInput } from './policy';

const base: CoachInput = {
  nowSec: 20,
  lastPromptSec: null,
  lastSpecificPraiseSec: null,
  childSpokeSec: null,
  reflectedSinceChildSpoke: false,
  justCoded: null,
};

describe('reacting to a sentence', () => {
  it('offers a swap after a question, a command and a criticism', () => {
    expect(coachPrompt({ ...base, justCoded: codeSentence('What are you making?') })?.kind).toBe('swap');
    expect(coachPrompt({ ...base, justCoded: codeSentence('Put it here.') })?.kind).toBe('swap');
    expect(coachPrompt({ ...base, justCoded: codeSentence("Don't throw it.") })?.kind).toBe('swap');
  });
  it('praises the parent for a target sentence', () => {
    const p = coachPrompt({ ...base, justCoded: codeSentence("You're putting the blue block on top.") });
    expect(p?.kind).toBe('praise_parent');
    expect(p?.text).toContain('description');
  });
  it('turns general praise into a hint to be specific', () => {
    expect(coachPrompt({ ...base, justCoded: codeSentence('Good job!') })?.text).toContain('exactly what');
  });
  it('stays quiet about neutral talk', () => {
    expect(coachPrompt({ ...base, justCoded: codeSentence("That's a red one.") })).toBeNull();
  });
  it('never scolds: no line contains wrong, bad, mistake or should', () => {
    const lines = [
      'What are you making?',
      'Put it here.',
      "Don't throw it.",
      'Good job!',
      "You're stacking them.",
      'Nice tower!',
    ].map((t) => coachPrompt({ ...base, justCoded: codeSentence(t) })?.text ?? '');
    for (const line of lines) expect(line).not.toMatch(/\b(wrong|bad|mistake|should|don't)\b/i);
  });
  it('does not speak twice within eight seconds', () => {
    expect(coachPrompt({ ...base, lastPromptSec: 15, justCoded: codeSentence('Put it here.') })).toBeNull();
    expect(coachPrompt({ ...base, lastPromptSec: 12, justCoded: codeSentence('Put it here.') })?.kind).toBe('swap');
  });
});

describe('nudges on a quiet moment', () => {
  it('asks for a reflection five seconds after she spoke', () => {
    expect(coachPrompt({ ...base, nowSec: 20, childSpokeSec: 16 })).toBeNull();
    expect(coachPrompt({ ...base, nowSec: 21, childSpokeSec: 16 })?.kind).toBe('reflect_now');
  });
  it('does not ask again once the parent has reflected', () => {
    expect(coachPrompt({ ...base, nowSec: 30, childSpokeSec: 16, reflectedSinceChildSpoke: true })).toBeNull();
  });
  it('asks for specific praise after forty seconds without one', () => {
    expect(coachPrompt({ ...base, nowSec: 39 })).toBeNull();
    expect(coachPrompt({ ...base, nowSec: 40 })?.kind).toBe('praise_now');
    expect(coachPrompt({ ...base, nowSec: 70, lastSpecificPraiseSec: 35 })).toBeNull();
    expect(coachPrompt({ ...base, nowSec: 80, lastSpecificPraiseSec: 35 })?.kind).toBe('praise_now');
  });
  it('keeps fifteen seconds between nudges', () => {
    expect(coachPrompt({ ...base, nowSec: 50, lastPromptSec: 40 })).toBeNull();
    expect(coachPrompt({ ...base, nowSec: 55, lastPromptSec: 40 })?.kind).toBe('praise_now');
  });
});
