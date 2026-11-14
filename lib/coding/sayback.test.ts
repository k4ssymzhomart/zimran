import { describe, expect, it } from 'vitest';
import { SCENES } from '../child/scenes';
import { codeTurn } from './classify';

const codes = (parent: string, child: string | null) => codeTurn(parent, { childLastSaid: child }).map((c) => c.code);

describe("saying Mia's words back", () => {
  it('codes every line of every scene, said back word for word, as a reflection', () => {
    for (const scene of SCENES) {
      const lines = [...scene.actions, scene.whine, ...(scene.whineAlt ?? [])].map((a) => a.says).filter((s): s is string => Boolean(s));
      expect(lines.length).toBeGreaterThan(10);
      for (const line of lines) expect(codes(line, line), line).toEqual(['reflection']);
    }
  });

  it('codes the natural way of saying her line back as a reflection, complaints included', () => {
    const pairs: [string, string][] = [
      ['You made a tower!', 'I made a tower!'],
      ['This block is for me.', 'This block is for you.'],
      ["You can't do it.", "I can't do it!"],
      ['This is too hard.', 'This is too hard.'],
      ["It's too hard for you.", 'This is too hard.'],
      ['It keeps falling.', 'It keeps falling!'],
      ['This is your house.', 'This is our house.'],
      ['You messed up.', 'I messed up.'],
      ["It's not good.", 'It is not good.'],
      ["It doesn't look right.", "It doesn't look right!"],
    ];
    for (const [parent, child] of pairs) expect(codes(parent, child), parent).toEqual(['reflection']);
  });

  it('still codes a correction of her as criticism', () => {
    expect(codes('You are too rough.', 'This is too hard.')).toEqual(['criticism']);
    expect(codes("That's not how you do it.", 'It is not good.')).toEqual(['criticism']);
    expect(codes('This is too hard.', 'I made a tower!')).toEqual(['criticism']);
    expect(codes("You can't do it.", null)).toEqual(['criticism']);
  });
});
