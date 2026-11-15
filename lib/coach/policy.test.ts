import { describe, expect, it } from 'vitest';
import { codeSentence } from '../coding/classify';
import { CALM_PRAISE_TEXT, coachPrompt, WAIT_OUT_TEXT, type CoachInput } from './policy';

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
  // Changed with E2: this used a command, which now gets its swap line with no gap.
  it('does not praise the parent twice within eight seconds', () => {
    expect(coachPrompt({ ...base, lastPromptSec: 15, justCoded: codeSentence("You're stacking them.") })).toBeNull();
    expect(coachPrompt({ ...base, lastPromptSec: 12, justCoded: codeSentence("You're stacking them.") })?.kind).toBe('praise_parent');
    expect(coachPrompt({ ...base, lastPromptSec: 15, justCoded: codeSentence('Good job!') })).toBeNull();
    expect(coachPrompt({ ...base, lastPromptSec: 12, justCoded: codeSentence('Good job!') })?.kind).toBe('swap');
  });
  it('always gives a question, a command and a criticism their swap line, whatever was just shown', () => {
    for (const lastPromptSec of [20, 19.75, 15, 12, null]) {
      for (const text of ['What are you making?', 'Put it here.', "Don't throw it."]) {
        expect(coachPrompt({ ...base, lastPromptSec, justCoded: codeSentence(text) })?.kind, `${text} after ${lastPromptSec}`).toBe('swap');
      }
    }
    // Also in the middle of an outburst.
    expect(coachPrompt({ ...base, lastPromptSec: 20, outburst: true, waitOutShown: true, justCoded: codeSentence('Put it here.') })?.kind).toBe('swap');
  });
  it('has no exclamation mark in a line of its own, only inside a quoted example', () => {
    const lines = ['What are you making?', 'Put it here.', "Don't throw it.", 'Good job!', "You're stacking them.", 'Nice tower!', 'You made a tower.'].map(
      (t) => coachPrompt({ ...base, justCoded: codeSentence(t, { childLastSaid: 'I made a tower!' }) })?.text ?? '',
    );
    for (const line of [...lines, WAIT_OUT_TEXT, CALM_PRAISE_TEXT]) expect(line.replace(/“[^”]*”/g, '')).not.toContain('!');
  });
});

describe('outbursts', () => {
  const upset: CoachInput = { ...base, nowSec: 35, childSpokeSec: 28, outburst: true };

  it('says to wait it out, at once and once', () => {
    expect(coachPrompt(upset)).toEqual({ kind: 'wait_out', text: 'She is upset. Stay close and quiet, then praise the first calm thing she does.' });
    // No gap: a line shown a second ago does not hold it back.
    expect(coachPrompt({ ...upset, lastPromptSec: 34 })?.kind).toBe('wait_out');
    expect(coachPrompt({ ...upset, waitOutShown: true })).toBeNull();
  });
  it('never asks to say her words back or to praise during an outburst', () => {
    for (const nowSec of [33, 35, 60, 200]) {
      for (const waitOutShown of [false, true]) {
        const kind = coachPrompt({ ...upset, nowSec, waitOutShown })?.kind;
        expect(kind).not.toBe('reflect_now');
        expect(kind).not.toBe('praise_now');
      }
    }
  });
  it('holds its praise for the parent while she is upset', () => {
    expect(coachPrompt({ ...upset, waitOutShown: true, justCoded: codeSentence("You're stacking them.") })).toBeNull();
    expect(coachPrompt({ ...upset, waitOutShown: true, justCoded: codeSentence('Good job!') })).toBeNull();
  });
  it('asks for praise when she is calm again: at once after wait_out, after a short pause otherwise', () => {
    const calm: CoachInput = { ...base, nowSec: 42, lastPromptSec: 35, calmAgain: true };
    const line = { kind: 'praise_now', text: 'She is calm again. Praise that: “Thank you for using your calm voice.”' };
    expect(coachPrompt({ ...calm, waitOutShown: true })).toEqual(line);
    expect(coachPrompt({ ...calm, lastPromptSec: 41 })).toBeNull();
    expect(coachPrompt({ ...calm, lastPromptSec: 34 })).toEqual(line);
    // It comes before the nudge to reflect.
    expect(coachPrompt({ ...calm, lastPromptSec: null, childSpokeSec: 30 })).toEqual(line);
    // The example it quotes is specific praise.
    expect(codeSentence('Thank you for using your calm voice.').code).toBe('specific_praise');
  });
  it('does not ask to say back a line that cannot be said back', () => {
    const quiet: CoachInput = { ...base, nowSec: 21, childSpokeSec: 16 };
    expect(coachPrompt(quiet)?.kind).toBe('reflect_now');
    expect(coachPrompt({ ...quiet, canReflect: true })?.kind).toBe('reflect_now');
    expect(coachPrompt({ ...quiet, canReflect: false })).toBeNull();
    // The praise nudge is not blocked by it.
    expect(coachPrompt({ ...quiet, nowSec: 45, canReflect: false })?.kind).toBe('praise_now');
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

describe('wording', () => {
  const say = (code: Parameters<typeof codeSentence>[0], live = false) => coachPrompt({ ...base, live, justCoded: codeSentence(code) })?.text;

  it('the line for a command reads for a son too once the screens swap the pronouns', () => {
    // "Let her lead" became "Let his lead" for Leo: after "her" the screens take "lead" for a noun.
    expect(say('Put it here.')).toBe('Follow her lead for now. Say what she chose to do.');
  });

  it('live play says "your child" and "they"; practice with Mia is unchanged', () => {
    expect(say('Put it over there.', true)).toBe('Let your child lead for now. Say what they chose to do.');
    expect(say("You're stacking the blocks.", true)).toBe('Nice description. You named exactly what your child did.');
    expect(say('I love how gently you stack.', true)).toBe('Nice specific praise. Your child knows exactly what you liked.');
    expect(say('Good job!', true)).toBe('Warm. Now add exactly what your child did: “Good job stacking so gently.”');
    expect(coachPrompt({ ...base, live: true, nowSec: 100 })?.text).toBe('Praise one exact thing your child just did.');
    expect(say('What is that?', true)).toBe(say('What is that?'));
    expect(say("Don't do that.", true)).toBe(say("Don't do that."));
    expect(say("You're stacking the blocks.")).toBe('Nice description. You named exactly what she did.');
    expect(say('Good job!')).toBe('Warm. Now add exactly what she did: “Good job stacking so gently.”');
    expect(coachPrompt({ ...base, nowSec: 100 })?.text).toBe('Praise one exact thing she just did.');
  });

  it('no live line says she or her, and no line shouts outside a quoted example', () => {
    const lines: string[] = [];
    for (const live of [true, false]) {
      for (const text of ['Put it here.', 'What is that?', "Don't.", "You're stacking the blocks.", 'I love how gently you stack.', 'Good job!']) lines.push(say(text, live) ?? '');
      lines.push(coachPrompt({ ...base, live, nowSec: 100 })?.text ?? '');
      if (live) for (const line of lines) expect(line).not.toMatch(/\b(?:she|her|Mia)\b/i);
    }
    for (const line of lines) {
      expect(line.replace(/“[^”]*”/g, ''), line).not.toContain('!');
      expect(line).not.toMatch(/\b(wrong|bad|mistake|fail\w*|should|don['’]t|dont)\b/i);
    }
  });
});
