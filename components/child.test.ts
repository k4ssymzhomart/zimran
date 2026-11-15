import { describe, expect, it } from 'vitest';
import { forChild } from './child';
import { BLOCKS, DRAWING } from '../lib/child/scenes';
import { LEVER_TEXT } from '../lib/progress/targets';
import { PLAN } from '../lib/progress/plan';
import { MICRO_REACTION } from '../lib/child/model';

describe('forChild', () => {
  it('leaves Mia’s text untouched', () => {
    expect(forChild('Say her words back to her.', 'mia')).toBe('Say her words back to her.');
  });

  it('renames her and turns possessive "her" into "his"', () => {
    expect(forChild('Mia stacks a red block. Say her words back.', 'leo')).toBe('Leo stacks a red block. Say his words back.');
    expect(forChild('Describe her hands', 'leo')).toBe('Describe his hands');
    expect(forChild('Follow her lead', 'leo')).toBe('Follow his lead');
    expect(forChild("Mia's shoulders drop.", 'leo')).toBe("Leo's shoulders drop.");
  });

  it('turns object "her" into "him"', () => {
    expect(forChild('It also asks her to stop playing and answer you.', 'leo')).toBe('It also asks him to stop playing and answer you.');
    expect(forChild('Let her choose the game', 'leo')).toBe('Let him choose the game');
    expect(forChild('say what you see her doing.', 'leo')).toBe('say what you see him doing.');
    expect(forChild('She heard you. Praise her.', 'leo')).toBe('He heard you. Praise him.');
    expect(forChild('telling her what to do', 'leo')).toBe('telling him what to do');
  });

  it('handles the other words', () => {
    expect(forChild('Good girl.', 'leo')).toBe('Good boy.');
    expect(forChild('she knows what to do again', 'leo')).toBe('he knows what to do again');
    expect(forChild(null, 'leo')).toBeNull();
  });

  it('leaves no "she" or "her" in any engine line the screens show', () => {
    const lines = [
      ...[BLOCKS, DRAWING].flatMap((s) => [
        s.intro,
        ...s.actions.map((a) => a.does),
        s.wander.does,
        s.whine.does,
        s.meltdown.does,
        ...(s.whineAlt ?? []).map((a) => a.does),
        s.farewell.high,
        s.farewell.mid,
        s.farewell.low,
      ]),
      ...Object.values(LEVER_TEXT),
      ...PLAN.flatMap((d) => [d.title, d.teaser]),
      ...Object.values(MICRO_REACTION),
    ];
    for (const line of lines) {
      const out = forChild(line, 'leo');
      expect(out, line).not.toMatch(/\b(she|She|her|Her|Mia)\b/);
    }
  });
});
