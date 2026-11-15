import { describe, expect, it } from 'vitest';
import { SCENES } from '../child/scenes';
import { BLINDSET } from './blindset';
import { codeSentence, codeTurn } from './classify';
import { EXAMPLES } from './examples';
import { HELDOUT } from './heldout';
import { CRISIS_LINES, isSafetyConcern, SAFETY_NOTE } from './safety';

const CONCERNS = [
  "I'm going to spank you.",
  'I will spank you if you do that again.',
  'Do you want a spanking?',
  'I am going to hit you.',
  'im gonna slap you',
  'I almost hit her today.',
  'I hit my son yesterday.',
  'I slapped him.',
  'I shook the baby.',
  'I feel like I could shake her.',
  'Sometimes I want to hurt my child.',
  'I want to hurt myself.',
  'I am going to kill myself.',
  "I can't go on.",
  'I cant do this anymore',
  "I can't take it anymore.",
  "I can't cope.",
  'I want to die.',
  "I don't want to live.",
  'They would be better off without me.',
  'I could kill her.',
  'I want to harm him.',
  'I hit them.',
  'I hit her too.',
  'I spank him a lot.',
];

const PLAY_TALK = [
  'The car hit the wall.',
  "Don't hit the tower.",
  'You hit the drum.',
  'You are hitting the blocks together.',
  'The tower is shaking.',
  'You shook the box.',
  'I shook the dice.',
  'I hit the ball to you.',
  "I'm going to hit the drum.",
  'I hurt my knee.',
  'Did that hurt?',
  'That slap sound was loud.',
  "I can't do it.",
  "You can't do it.",
  "I can't go on the slide.",
  "I can't find the red one.",
  'The train cannot go on.',
  'I am going to get you!',
  'I am going to beat you at this game.',
  'The dinosaur is going to eat you.',
  'Stop hitting.',
  'No hitting.',
  'I made a tower!',
  'This is too hard.',
  'I messed up.',
  'The dragon is going to kill you!',
  'The monster will kill them.',
  'Let me kill them with kindness.',
  "I'm going to hit them together too.",
  "I'll shake them too.",
  'I shake the baby rattle.',
  "I will shake the baby doll's bottle.",
  "I'm going to shake her hand.",
  'I hurt her feelings.',
  'I hit her tower with my car.',
];

describe('isSafetyConcern', () => {
  it.each(CONCERNS)('is true for: %s', (text) => {
    expect(isSafetyConcern(text)).toBe(true);
  });

  it.each(PLAY_TALK)('stays quiet on play talk: %s', (text) => {
    expect(isSafetyConcern(text)).toBe(false);
  });

  it('stays quiet on everything Mia says and on every labeled example the coder is tested with', () => {
    const mia = SCENES.flatMap((s) => [...s.actions, s.wander, s.whine, ...(s.whineAlt ?? []), s.meltdown].flatMap((a) => [a.does, a.says ?? '']));
    const labeled = [...EXAMPLES.map(([text]) => text), ...BLINDSET.map((row) => String(row[0])), ...HELDOUT.map((row) => String(row[0]))];
    expect(labeled.length).toBeGreaterThan(200);
    for (const text of [...mia, ...labeled]) expect(isSafetyConcern(text), text).toBe(false);
  });

  it('never throws on odd input', () => {
    for (const odd of ['', '   ', '???', '12345', 'a'.repeat(5000), '😀😀', 'Ты строишь башню.']) expect(isSafetyConcern(odd)).toBe(false);
  });
});

describe('a safety sentence is not coded', () => {
  it('gets no code and no bucket, so it cannot count for or against the parent', () => {
    for (const text of CONCERNS) {
      const coded = codeSentence(text);
      expect(coded, text).toMatchObject({ code: 'unknown', bucket: 'none', rule: 'safety' });
    }
  });

  it('leaves the other sentences of the turn coded as usual', () => {
    expect(codeTurn("You're stacking them. I can't do this anymore. What is that?").map((c) => c.code)).toEqual(['description', 'unknown', 'question']);
  });

  it('play talk about hitting keeps its ordinary code', () => {
    expect(codeSentence('The car hit the wall.').code).toBe('neutral');
    expect(codeSentence("Don't hit the tower.").code).toBe('criticism');
    expect(codeSentence('You hit the drum.').rule).not.toBe('safety');
  });
});

describe('the support note', () => {
  it('prints the two crisis lines exactly and nothing else that looks like a contact', () => {
    expect(CRISIS_LINES).toEqual(['Call or text 988 (Suicide & Crisis Lifeline)', 'Childhelp National Child Abuse Hotline: 1-800-422-4453']);
    for (const line of CRISIS_LINES) expect(SAFETY_NOTE.body).toContain(line);
    const withoutLines = CRISIS_LINES.reduce((text, line) => text.replace(line, ''), SAFETY_NOTE.body);
    expect(withoutLines).not.toMatch(/\d|@|https?:/);
  });

  it('does not scold', () => {
    expect(`${SAFETY_NOTE.headline} ${SAFETY_NOTE.body}`).not.toMatch(/\b(wrong|bad|mistake|should|don't|dont)\b/i);
  });
});
